import random
from collections import Counter
from datetime import timedelta
from os import getenv

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from accounts.models import AccountProfile
from catalog.models import DeviceVariant
from marketplace.models import Offer, Store, StoreLegalProfile
from shopping.models import Basket, BasketItem, CheckoutAttempt, Order, OrderItem
from wallet.models import Wallet, WalletTransaction

from simulation.config import preset
from simulation.models import SimulationRun
from simulation.ownership import mark_status, record
from simulation.safety import assert_safe_database, database_engine, database_name

User = get_user_model()


def _password(seed, index):
    return f"SimPass!{seed}_{index}"


class Command(BaseCommand):
    help = "Create reproducible, run-owned development data for backend simulation."

    def add_arguments(self, parser):
        parser.add_argument("--preset", choices=("small", "medium", "large"), default="small")
        parser.add_argument("--seed", type=int, default=20260726)
        parser.add_argument("--run-id", required=True)
        parser.add_argument("--confirm-database")
        parser.add_argument("--base-url", default=getenv("SIMULATION_BASE_URL", "http://127.0.0.1:8000"))

    def handle(self, *args, **options):
        try:
            assert_safe_database(
                confirm_database=options.get("confirm_database"),
                destructive=True,
            )
        except Exception as exc:
            raise CommandError(str(exc)) from exc

        if SimulationRun.objects.filter(run_id=options["run_id"]).exists():
            raise CommandError("That simulation run already exists; choose a new run_id.")

        counts = Counter()
        run = SimulationRun.objects.create(
            run_id=options["run_id"],
            seed=options["seed"],
            preset=options["preset"],
            status=SimulationRun.Status.CREATED,
            environment=getenv("DJANGO_ENV", "development"),
            database_engine=database_engine(),
            database_name=database_name(),
            base_url=options["base_url"],
            configuration={"preset": options["preset"], "seed": options["seed"]},
            started_at=timezone.now(),
        )
        try:
            with transaction.atomic():
                mark_status(run, SimulationRun.Status.SEEDING)
                rng = random.Random(options["seed"])
                data = self._seed(run, preset(options["preset"]), rng, options["seed"], counts)
                run.initial_state = data["initial_state"]
                run.created_counts = dict(counts)
                mark_status(run, SimulationRun.Status.SEEDED, finished_at=timezone.now())
        except Exception as exc:
            run.failure_summary = {"type": type(exc).__name__, "detail": str(exc)[:500]}
            mark_status(run, SimulationRun.Status.FAILED, finished_at=timezone.now())
            raise CommandError(f"Simulation seeding failed: {exc}") from exc

        self.stdout.write(self.style.SUCCESS(
            f"Seeded run {run.run_id}: {dict(counts)}"
        ))

    def _save(self, run, instance, counts, *, identity=None):
        record(run, instance, identity_marker=identity)
        counts[instance._meta.model_name] += 1
        return instance

    def _seed(self, run, config, rng, seed, counts):
        # Generated Staff users deliberately have no AccountProfile. A
        # configured Staff fixture is reused when present and only recorded as
        # owned when this command creates it.
        for index in range(1, config.staff + 1):
            staff = User.objects.create_user(
                username=f"sim-{run.run_id}-staff-{index:04d}",
                email=f"sim-{run.run_id}-staff-{index:04d}@example.test",
                password=_password(seed, 20_000 + index),
                is_staff=True,
            )
            self._save(run, staff, counts, identity=f"sim-{run.run_id}")
        configured_username = getenv("SIMULATION_STAFF_USERNAME")
        configured_password = getenv("SIMULATION_STAFF_PASSWORD")
        if configured_username and configured_password:
            staff, created = User.objects.get_or_create(
                username=configured_username,
                defaults={
                    "email": f"{configured_username}@example.test",
                    "is_staff": True,
                    "is_active": True,
                },
            )
            if created:
                staff.set_password(configured_password)
                staff.is_staff = True
                staff.save()
                self._save(run, staff, counts, identity=None)
            elif not staff.is_staff:
                raise CommandError("Configured simulation Staff user is not is_staff.")

        customers = []
        for index in range(1, config.customers + 1):
            user = User.objects.create_user(
                username=f"sim-{run.run_id}-customer-{index:04d}",
                email=f"sim-{run.run_id}-customer-{index:04d}@example.test",
                password=_password(seed, index),
            )
            self._save(run, user, counts, identity=f"sim-{run.run_id}")
            profile = self._save(
                run,
                AccountProfile.objects.create(user=user, account_type=AccountProfile.AccountType.CUSTOMER),
                counts,
            )
            wallet = self._save(run, Wallet.objects.create(user=user, balance=0), counts)
            charge = self._save(
                run,
                WalletTransaction.objects.create(
                    wallet=wallet, amount=1_000_000_000, balance_after=1_000_000_000,
                    transaction_type=WalletTransaction.TransactionType.CHARGE,
                ),
                counts,
            )
            wallet.balance = charge.balance_after
            wallet.save(update_fields=["balance", "updated_at"])
            customers.append((user, wallet))

        stores = []
        for index in range(1, config.stores + 1):
            owner = User.objects.create_user(
                username=f"sim-{run.run_id}-store-{index:04d}",
                email=f"sim-{run.run_id}-store-{index:04d}@example.test",
                password=_password(seed, 10_000 + index),
            )
            self._save(run, owner, counts, identity=f"sim-{run.run_id}")
            profile = self._save(
                run,
                AccountProfile.objects.create(user=owner, account_type=AccountProfile.AccountType.STORE),
                counts,
            )
            statuses = [Store.Status.ACTIVE, Store.Status.PENDING, Store.Status.REJECTED, Store.Status.SUSPENDED]
            status = statuses[(index - 1) % len(statuses)]
            store = self._save(
                run,
                Store.objects.create(
                    account_profile=profile,
                    name=f"Simulation Store {run.run_id}-{index:04d}",
                    slug=f"sim-{run.run_id}-store-{index:04d}",
                    description="Synthetic simulation store.",
                    business_phone=f"+000-{seed % 1000000:06d}-{index:04d}",
                    business_email=f"sim-{run.run_id}-store-{index:04d}@example.test",
                    address=f"Synthetic address {run.run_id}-{index:04d}",
                    status=status,
                ),
                counts,
            )
            self._save(
                run,
                StoreLegalProfile.objects.create(
                    store=store,
                    legal_name=f"Simulation Legal Entity {run.run_id}-{index:04d}",
                    business_type="synthetic",
                    business_registration_number=f"SIM-{run.run_id}-{index:04d}",
                    national_identifier=f"SIM-NI-{run.run_id}-{index:04d}",
                    tax_identifier=f"SIM-TAX-{run.run_id}-{index:04d}",
                    legal_representative_name=f"Simulation Representative {index:04d}",
                    legal_representative_national_identifier=f"SIM-RN-{run.run_id}-{index:04d}",
                ),
                counts,
            )
            stores.append(store)

        variants = list(
            DeviceVariant.objects.filter(
                is_available=True,
                device_model__is_catalog_eligible=True,
            ).order_by("pk")
        )
        if not variants:
            raise CommandError("The catalog has no eligible available DeviceVariant rows.")

        active_stores = [store for store in stores if store.status == Store.Status.ACTIVE]
        if not active_stores:
            raise CommandError("The preset must create at least one active Store.")
        target_offers = min(config.offers, len(active_stores) * len(variants))
        offers = []
        initial_state = {"offers": {}}
        for offset in range(target_offers):
            store = active_stores[offset % len(active_stores)]
            variant = variants[offset % len(variants)]
            if Offer.objects.filter(store=store, device_variant=variant).exists():
                continue
            quantity = rng.randint(0, 12)
            offer = self._save(
                run,
                Offer.objects.create(
                    store=store,
                    device_variant=variant,
                    price=rng.randint(10, 100) * 1_000_000,
                    quantity=quantity,
                    description="Synthetic simulation offer.",
                ),
                counts,
            )
            offers.append(offer)
            initial_state["offers"][str(offer.pk)] = {
                "initial_quantity": quantity,
                "sold": 0,
                "restored": 0,
            }

        # Create one Basket per customer; a subset receives active reservations.
        for index, (user, _wallet) in enumerate(customers):
            basket = self._save(run, Basket.objects.create(user=user), counts)
            if offers and index % 3 == 0:
                offer = offers[index % len(offers)]
                if offer.quantity > 0:
                    item = self._save(
                        run,
                        BasketItem.objects.create(
                            basket=basket,
                            offer=offer,
                            quantity=1,
                            unit_price=offer.price,
                            expires_at=timezone.now() + timedelta(minutes=25),
                        ),
                        counts,
                    )
                    offer.quantity -= item.quantity
                    offer.save(update_fields=["quantity", "updated_at"])
                    initial_state["offers"][str(offer.pk)]["reserved"] = 1

        # Historical Orders are created only from positive-stock offers. They
        # are explicit fixtures, not claims about an HTTP checkout run.
        order_target = min(config.orders, len(customers), len(offers))
        for index in range(order_target):
            user, wallet = customers[index]
            basket = Basket.objects.get(user=user)
            offer = offers[index % len(offers)]
            if offer.quantity <= 0:
                continue
            quantity = 1
            order = self._save(
                run,
                Order.objects.create(
                    basket=basket,
                    store=offer.store,
                    status=Order.Status.PAID,
                ),
                counts,
            )
            self._save(
                run,
                OrderItem.objects.create(
                    order=order,
                    offer=offer,
                    quantity=quantity,
                    unit_price=offer.price,
                ),
                counts,
            )
            offer.quantity -= quantity
            offer.save(update_fields=["quantity", "updated_at"])
            initial_state["offers"][str(offer.pk)]["sold"] += quantity
            wallet.balance -= offer.price
            wallet.save(update_fields=["balance", "updated_at"])
            self._save(
                run,
                WalletTransaction.objects.create(
                    wallet=wallet,
                    order=order,
                    amount=-offer.price,
                    balance_after=wallet.balance,
                    transaction_type=WalletTransaction.TransactionType.PURCHASE,
                ),
                counts,
            )
            attempt = self._save(
                run,
                CheckoutAttempt.objects.create(
                    user=user,
                    operation="checkout",
                    idempotency_key=f"seed-{run.run_id}-{index:04d}",
                    status=CheckoutAttempt.Status.SUCCEEDED,
                    response_payload={"seeded": True, "order_id": order.pk},
                ),
                counts,
            )
            if index % 4 == 0:
                order.status = Order.Status.CANCELLED
                order.save(update_fields=["status", "updated_at"])
                wallet.balance += offer.price
                wallet.save(update_fields=["balance", "updated_at"])
                initial_state["offers"][str(offer.pk)]["restored"] += quantity
                self._save(
                    run,
                    WalletTransaction.objects.create(
                        wallet=wallet,
                        order=order,
                        amount=offer.price,
                        balance_after=wallet.balance,
                        transaction_type=WalletTransaction.TransactionType.REFUND,
                    ),
                    counts,
                )
                offer.quantity += quantity
                offer.save(update_fields=["quantity", "updated_at"])
            del attempt

        return {"initial_state": initial_state}
