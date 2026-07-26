import uuid
from concurrent.futures import ThreadPoolExecutor
from dataclasses import asdict, dataclass
from threading import Barrier

from django.contrib.auth import get_user_model
from django.db import close_old_connections, connection, transaction
from django.db.models import F, Sum
from django.utils import timezone

from accounts.models import AccountProfile
from catalog.models import DeviceVariant
from marketplace.models import Offer, Store, StoreLegalProfile
from shopping.models import Basket, BasketItem, Order
from shopping.services import cancel_order, checkout_customer
from wallet.models import Wallet
from wallet.services import charge_wallet

from simulation.models import SimulationRun
from simulation.ownership import record

User = get_user_model()


@dataclass
class ConcurrencyResult:
    name: str
    status: str
    authoritative: bool
    passed: bool
    detail: str
    values: dict


def _result(name, passed, detail, values=None, *, authoritative=True, status="completed"):
    return ConcurrencyResult(name, status, authoritative, passed, detail, values or {})


def _owned_context(run):
    store = Store.objects.filter(
        slug__startswith=f"sim-{run.run_id}-",
        status=Store.Status.ACTIVE,
    ).first()
    variant = DeviceVariant.objects.filter(
        is_available=True,
        device_model__is_catalog_eligible=True,
    ).order_by("pk").first()
    if not store or not variant:
        raise RuntimeError("The run needs an active Store and eligible DeviceVariant.")
    return store, variant


def _new_customer(run, index):
    username = f"sim-{run.run_id}-concurrency-customer-{index}-{uuid.uuid4().hex[:8]}"
    user = User.objects.create_user(
        username=username,
        email=f"{username}@example.test",
        password="unused-by-direct-concurrency-test",
    )
    profile = AccountProfile.objects.create(
        user=user,
        account_type=AccountProfile.AccountType.CUSTOMER,
    )
    wallet = Wallet.objects.create(user=user, balance=1_000_000_000)
    record(run, user, identity_marker=f"sim-{run.run_id}")
    record(run, profile)
    record(run, wallet)
    return user, wallet


def _new_offer(run, store, variant, quantity=100):
    # The run's active stores normally have unused variants. If a collision
    # occurs, select another eligible variant before failing explicitly.
    candidate = variant
    for candidate in DeviceVariant.objects.filter(
        is_available=True,
        device_model__is_catalog_eligible=True,
    ).order_by("pk"):
        if not Offer.objects.filter(store=store, device_variant=candidate).exists():
            break
    offer = Offer.objects.create(
        store=store,
        device_variant=candidate,
        price=1_000_000,
        quantity=quantity,
        description="Concurrency fixture.",
    )
    record(run, offer)
    return offer


def _reserve(user, offer, quantity=1):
    with transaction.atomic():
        basket, _ = Basket.objects.get_or_create(user=user)
        basket = Basket.objects.select_for_update().get(pk=basket.pk)
        offer = Offer.objects.select_for_update().get(pk=offer.pk)
        if offer.quantity < quantity:
            return False
        offer.quantity = F("quantity") - quantity
        offer.save(update_fields=["quantity", "updated_at"])
        BasketItem.objects.create(
            basket=basket,
            offer=offer,
            quantity=quantity,
            unit_price=offer.price,
        )
        return True


def _record_customer_state(run, user):
    basket = Basket.objects.filter(user=user).first()
    if basket:
        record(run, basket)
        for item in basket.items.all():
            record(run, item)
    for order in Order.objects.filter(basket__user=user):
        record(run, order)
        for item in order.items.all():
            record(run, item)
        for transaction_record in order.wallet_transactions.all():
            record(run, transaction_record)
    for attempt in user.checkout_attempts.all():
        record(run, attempt)
    for transaction_record in user.wallet.transactions.all():
        record(run, transaction_record)


def _same_checkout_key(run, store, variant):
    user, wallet = _new_customer(run, 101)
    offer = _new_offer(run, store, variant, 10)
    assert _reserve(user, offer)
    key = f"concurrency-same-{uuid.uuid4().hex}"
    barrier = Barrier(2)

    def worker():
        close_old_connections()
        barrier.wait()
        try:
            return checkout_customer(user, key)
        finally:
            close_old_connections()

    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = [pool.submit(worker) for _ in range(2)]
        values = [future.result() for future in futures]
    _record_customer_state(run, user)
    wallet.refresh_from_db()
    successes = sum(bool(value[1]) is False for value in values)
    orders = Order.objects.filter(basket__user=user).count()
    passed = successes == 1 and orders == 1
    return _result(
        "same_checkout_key",
        passed,
        "Exactly one financial checkout must execute.",
        {"executions": successes, "orders": orders, "wallet_balance": wallet.balance},
    )


def _same_topup_key(run):
    user, wallet = _new_customer(run, 102)
    key = f"concurrency-topup-{uuid.uuid4().hex}"
    barrier = Barrier(2)

    def worker():
        close_old_connections()
        barrier.wait()
        try:
            return charge_wallet(user, 5_000_000, key)
        finally:
            close_old_connections()

    with ThreadPoolExecutor(max_workers=2) as pool:
        values = [future.result() for future in (pool.submit(worker), pool.submit(worker))]
    _record_customer_state(run, user)
    charges = wallet.transactions.filter(transaction_type="charge").count()
    wallet.refresh_from_db()
    passed = charges == 1 and wallet.balance == 1_005_000_000
    return _result(
        "same_topup_key",
        passed,
        "Exactly one top-up must credit the wallet.",
        {"charge_transactions": charges, "wallet_balance": wallet.balance},
    )


def _reservation_race(run, store, variant):
    customers = [_new_customer(run, 103), _new_customer(run, 104)]
    offer = _new_offer(run, store, variant, 1)
    barrier = Barrier(2)

    def worker(user):
        close_old_connections()
        barrier.wait()
        try:
            return _reserve(user, offer)
        finally:
            close_old_connections()

    with ThreadPoolExecutor(max_workers=2) as pool:
        values = [future.result() for future in (pool.submit(worker, customers[0][0]), pool.submit(worker, customers[1][0]))]
    offer.refresh_from_db()
    reserved = BasketItem.objects.filter(offer=offer).aggregate(total=Sum("quantity"))["total"] or 0
    for user, _wallet in customers:
        _record_customer_state(run, user)
    passed = sum(values) == 1 and offer.quantity == 0
    return _result(
        "final_unit_reservation_race",
        passed,
        "A final unit may be reserved by only one Customer.",
        {"successful_reservations": sum(values), "available_quantity": offer.quantity},
    )


def _cancellation_race(run, store, variant):
    user, wallet = _new_customer(run, 105)
    offer = _new_offer(run, store, variant, 3)
    _reserve(user, offer)
    checkout_customer(user, f"concurrency-cancel-setup-{uuid.uuid4().hex}")
    order = Order.objects.filter(basket__user=user).first()
    barrier = Barrier(2)

    def worker():
        close_old_connections()
        barrier.wait()
        try:
            return cancel_order(order.pk)
        finally:
            close_old_connections()

    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = [pool.submit(worker) for _ in range(2)]
        values = [future.result() for future in futures]
    _record_customer_state(run, user)
    order.refresh_from_db()
    refunds = order.wallet_transactions.filter(transaction_type="refund").count()
    passed = order.status == Order.Status.CANCELLED and refunds == 1 and sum(bool(value[1]) for value in values) == 1
    return _result(
        "concurrent_cancellation",
        passed,
        "Only one cancellation may restore stock and refund.",
        {"refund_transactions": refunds, "restoration_results": [value[1] for value in values]},
    )


def _staff_review_conflict(run):
    owner, _wallet = _new_customer(run, 106)
    owner.account_profile.account_type = AccountProfile.AccountType.STORE
    owner.account_profile.save(update_fields=["account_type", "updated_at"])
    store = Store.objects.create(
        account_profile=owner.account_profile,
        name=f"Concurrency Review Store {run.run_id}",
        slug=f"sim-{run.run_id}-concurrency-review",
        business_phone="+000-CONCURRENCY",
        business_email=f"review-{run.run_id}@example.test",
        address="Synthetic review address",
        status=Store.Status.PENDING,
    )
    legal = StoreLegalProfile.objects.create(
        store=store,
        legal_name=f"Concurrency Review Legal {run.run_id}",
        business_type="synthetic",
        legal_representative_name="Synthetic Reviewer",
    )
    record(run, store)
    record(run, legal)
    reviewers = list(
        User.objects.filter(username__startswith=f"sim-{run.run_id}-staff-", is_staff=True).order_by("pk")[:2]
    )
    if len(reviewers) < 2:
        return _result(
            "staff_review_conflict",
            False,
            "At least two run-owned Staff users are required.",
        )
    barrier = Barrier(2)

    def worker(action, reviewer):
        close_old_connections()
        barrier.wait()
        try:
            with transaction.atomic():
                locked = Store.objects.select_for_update().get(pk=store.pk)
                if locked.status != Store.Status.PENDING:
                    return False
                locked.status = action
                locked.reviewed_by = reviewer
                locked.reviewed_at = timezone.now()
                locked.save(update_fields=["status", "reviewed_by", "reviewed_at", "updated_at"])
                return True
        finally:
            close_old_connections()

    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = [
            pool.submit(worker, Store.Status.ACTIVE, reviewers[0]),
            pool.submit(worker, Store.Status.REJECTED, reviewers[1]),
        ]
        values = [future.result() for future in futures]
    store.refresh_from_db()
    passed = sum(values) == 1 and store.status in {Store.Status.ACTIVE, Store.Status.REJECTED}
    return _result(
        "staff_review_conflict",
        passed,
        "Only one conflicting Store review transition may win.",
        {"successful_transitions": sum(values), "final_status": store.status},
    )


def run_concurrency_suite(run):
    if connection.vendor != "postgresql":
        return [
            asdict(_result(
                "postgresql_concurrency_suite",
                False,
                "Skipped: SQLite cannot certify row-lock behavior.",
                authoritative=False,
                status="skipped",
            ))
        ]
    store, variant = _owned_context(run)
    results = []
    for function, args in (
        (_same_checkout_key, (run, store, variant)),
        (_same_topup_key, (run,)),
        (_reservation_race, (run, store, variant)),
        (_cancellation_race, (run, store, variant)),
        (_staff_review_conflict, (run,)),
    ):
        try:
            results.append(asdict(function(*args)))
        except Exception as exc:
            results.append(asdict(_result(
                function.__name__,
                False,
                f"{type(exc).__name__}: {exc}"[:500],
            )))
    return results
