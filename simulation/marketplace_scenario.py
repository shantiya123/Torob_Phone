"""Frontend-ready marketplace lifecycle scenario.

The scenario deliberately combines real HTTP role actions with bounded,
simulation-owned database work.  It is resumable through ``run.configuration``
and never uses live external catalog providers.
"""

from collections import Counter
from datetime import timedelta
import os
import random

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Count
from django.utils import timezone

from accounts.models import AccountProfile
from catalog.models import Brand, DeviceModel, DeviceVariant
from marketplace.models import Offer, Store
from shopping.models import Basket, BasketItem, CheckoutAttempt, Order, OrderItem
from wallet.models import Wallet, WalletTransaction

from .http.client import ApiClient
from .models import SimulationRun
from .ownership import record

User = get_user_model()

STAGES = (
    "registered_stores",
    "reviewed_stores",
    "catalog_ready",
    "offers_created",
    "customers_created",
    "wallets_charged",
    "basket_scenarios_complete",
    "checkout_scenarios_complete",
    "cancellation_scenarios_complete",
    "validated",
)


def _password(seed, index):
    return f"SimPass!{seed}_{index}"


def _payload_id(payload, key="id"):
    return payload.get(key) if isinstance(payload, dict) else None


class MarketplaceScenario:
    def __init__(self, run, *, base_url, seed, stores=6, approved_stores=5,
                 customers=10, offers_min=250, offers_max=300, mode="hybrid"):
        if stores != 6 or approved_stores != 5 or customers != 10:
            raise ValueError("The standard marketplace scenario requires 6 stores, 5 approvals, and 10 customers.")
        if not 250 <= offers_min <= offers_max <= 300:
            raise ValueError("Offer targets must remain within 250–300 per approved Store.")
        if mode not in {"api", "hybrid", "factory"}:
            raise ValueError("Offer mode must be api, hybrid, or factory.")
        self.run = run
        self.base_url = base_url
        self.seed = seed
        self.rng = random.Random(seed)
        self.stores = stores
        self.approved_stores = approved_stores
        self.customers = customers
        self.offers_min = offers_min
        self.offers_max = offers_max
        self.mode = mode
        self.manifest = dict(run.configuration.get("marketplace_manifest", {}))
        # Backfill deterministic indices for manifests produced by an
        # earlier interrupted build that stored only IDs/usernames.
        for position, row in enumerate(self.manifest.get("registered_stores", []), 1):
            row.setdefault("index", position)
        for position, row in enumerate(self.manifest.get("reviewed_stores", []), 1):
            row.setdefault("index", position)
        for position, row in enumerate(self.manifest.get("customers_created", []), 1):
            row.setdefault("index", position)
        self.results = {"stages": {}, "stores": [], "customers": [], "offers": [], "orders": []}

    def _save_manifest(self):
        self.run.configuration = {
            **self.run.configuration,
            "marketplace_manifest": self.manifest,
            "marketplace_options": {
                "stores": self.stores, "approved_stores": self.approved_stores,
                "customers": self.customers, "offers_min": self.offers_min,
                "offers_max": self.offers_max, "mode": self.mode,
            },
        }
        self.run.save(update_fields=["configuration", "updated_at"])

    def _stage_done(self, stage):
        return bool(self.manifest.get("stages", {}).get(stage))

    def _complete(self, stage, data=None):
        self.manifest.setdefault("stages", {})[stage] = True
        if data:
            self.manifest[stage] = data
        self._save_manifest()

    def _client(self):
        return ApiClient(self.base_url, timeout=30)

    def _find_user(self, username):
        return User.objects.get(username=username)

    def _ensure_run(self):
        if self.run.status == SimulationRun.Status.CREATED:
            self.run.status = SimulationRun.Status.RUNNING
            self.run.started_at = self.run.started_at or timezone.now()
            self.run.save(update_fields=["status", "started_at", "updated_at"])

    def register_stores(self):
        if self._stage_done("registered_stores"):
            return
        client = self._client()
        rows = []
        for index in range(1, 7):
            username = f"sim-{self.run.run_id}-market-store-{index:02d}"
            email = f"store-{index:02d}@{self.run.run_id}.example.test"
            response = client.register_store_profile(
                username, email, _password(self.seed, 10_000 + index),
                name=f"Simulation Marketplace Company {index:02d}", index=index,
            )
            if response.status_code != 201:
                raise RuntimeError(f"Store registration failed for {username}: {response.payload}")
            user = self._find_user(username)
            store = user.account_profile.store
            record(self.run, user, identity_marker=f"sim-{self.run.run_id}")
            record(self.run, user.account_profile)
            record(self.run, store, identity_marker=f"sim-{self.run.run_id}")
            record(self.run, store.legal_profile)
            rows.append({"index": index, "username": username, "store_id": store.pk, "status": store.status})
        self._complete("registered_stores", rows)

    def review_stores(self):
        if self._stage_done("reviewed_stores"):
            return
        username = os.getenv("SIMULATION_STAFF_USERNAME")
        password = os.getenv("SIMULATION_STAFF_PASSWORD")
        if not username or not password:
            raise RuntimeError("SIMULATION_STAFF_USERNAME and SIMULATION_STAFF_PASSWORD are required.")
        staff, created = User.objects.get_or_create(
            username=username,
            defaults={"email": f"{username}@example.test", "is_staff": True, "is_active": True},
        )
        if created:
            staff.set_password(password)
            staff.is_staff = True
            staff.is_active = True
            staff.save(update_fields=["password", "is_staff", "is_active"])
            record(self.run, staff, identity_marker=None)
        elif not staff.is_staff:
            raise RuntimeError("Configured simulation Staff user is not marked is_staff.")
        else:
            # This username is an explicit simulation fixture. Reconcile its
            # password with the local environment so a prior failed run
            # cannot leave the scenario permanently unauthenticated.
            changed = False
            if not staff.check_password(password):
                staff.set_password(password)
                changed = True
            if not staff.is_active:
                staff.is_active = True
                changed = True
            if changed:
                staff.save(update_fields=["password", "is_active"])
        client = self._client()
        login = client.login(username, password)
        if login.status_code != 200:
            raise RuntimeError(f"Staff login failed: {login.payload}")
        queue = client.request("GET", "/api/staff/store-reviews/?status=pending", expected=200)
        pending = queue.payload.get("results", []) if isinstance(queue.payload, dict) else []
        store_rows = self.manifest["registered_stores"]
        if len(pending) < len(store_rows):
            raise RuntimeError("Staff review queue did not contain all six applicants.")
        reviewed = []
        for index, row in enumerate(store_rows):
            sid = row["store_id"]
            detail = client.request("GET", f"/api/staff/store-reviews/{sid}/", expected=200)
            if detail.status_code != 200:
                raise RuntimeError(f"Could not inspect Store {sid}: {detail.payload}")
            if index < self.approved_stores:
                response = client.request("POST", f"/api/staff/store-reviews/{sid}/approve/",
                                           json={}, expected=200)
                expected = Store.Status.ACTIVE
            else:
                response = client.request("POST", f"/api/staff/store-reviews/{sid}/reject/",
                                           json={"rejection_reason": "Synthetic compliance evidence incomplete."},
                                           expected=200)
                expected = Store.Status.REJECTED
            if response.status_code != 200:
                raise RuntimeError(f"Review transition failed for Store {sid}: {response.payload}")
            store = Store.objects.get(pk=sid)
            if store.status != expected:
                raise RuntimeError(f"Store {sid} ended in {store.status}, expected {expected}.")
            reviewed.append({"index": row["index"], "store_id": sid, "status": store.status,
                             "rejection_reason": store.rejection_reason})
        self._complete("reviewed_stores", reviewed)

    @transaction.atomic
    def catalog_ready(self):
        if self._stage_done("catalog_ready"):
            return
        needed = self.offers_max
        variants = list(DeviceVariant.objects.filter(
            is_available=True, device_model__is_catalog_eligible=True
        ).order_by("pk"))
        created = []
        if len(variants) < needed:
            brand, _ = Brand.objects.get_or_create(
                slug=f"sim-{self.run.run_id}-catalog",
                defaults={"name": f"Simulation Catalog {self.run.run_id}"},
            )
            if brand.pk not in self.manifest.get("catalog_brand_ids", []):
                record(self.run, brand, identity_marker=f"sim-{self.run.run_id}")
            while len(variants) < needed:
                n = len(variants) + 1
                model, _ = DeviceModel.objects.get_or_create(
                    brand=brand, model_key=f"sim-phone-{n:04d}",
                    defaults={"model_name": f"Simulation Phone {n:04d}",
                              "device_kind": DeviceModel.DeviceKind.SMARTPHONE,
                              "is_catalog_eligible": True},
                )
                variant, _ = DeviceVariant.objects.get_or_create(
                    device_model=model, configuration_key=f"sim-{n:04d}-128-8",
                    defaults={"storage_gb": 128, "ram_gb": 8, "storage_technology": "UFS",
                              "sku_or_region": "simulation", "is_available": True},
                )
                if variant.pk not in {v.pk for v in variants}:
                    variants.append(variant)
                    created.append(variant.pk)
                    record(self.run, model, identity_marker=f"sim-{self.run.run_id}")
                    record(self.run, variant, identity_marker=f"sim-{self.run.run_id}")
        self.manifest["catalog_variant_ids"] = [v.pk for v in variants[:needed]]
        self.manifest["catalog_synthetic_variant_ids"] = created
        self._complete("catalog_ready", {"available_eligible_variants": len(variants), "synthetic_variant_ids": created})

    def _price(self, variant, store_index):
        # Keep generated prices inside the wallet API's supported demo range
        # while retaining meaningful Store pricing personalities.
        base = 4_000_000 + ((variant.pk * 7919) % 25_000_000)
        personality = [0.92, 0.98, 1.0, 1.06, 1.14][store_index % 5]
        return max(1_000_000, int(base * personality))

    def create_offers(self):
        if self._stage_done("offers_created"):
            return
        variants = list(DeviceVariant.objects.filter(pk__in=self.manifest["catalog_variant_ids"]).order_by("pk"))
        approved = [r for r in self.manifest["reviewed_stores"] if r["status"] == Store.Status.ACTIVE]
        if len(approved) != 5:
            raise RuntimeError("Exactly five approved Stores are required before offer creation.")
        client = self._client()
        all_rows = []
        for store_index, row in enumerate(approved):
            store = Store.objects.get(pk=row["store_id"])
            target = self.offers_min + ((self.seed + store.pk) % (self.offers_max - self.offers_min + 1))
            existing = {o.device_variant_id for o in store.offers.all()}
            missing = [v for v in variants if v.pk not in existing][:target - len(existing)]
            if self.mode in {"api", "hybrid"}:
                login = client.login(store.account_profile.user.username, _password(self.seed, 10_000 + row["index"]))
                if login.status_code != 200:
                    raise RuntimeError(f"Store login failed for {store.pk}: {login.payload}")
                api_count = len(missing) if self.mode == "api" else min(5, len(missing))
                for variant in missing[:api_count]:
                    response = client.request(
                        "POST", "/api/offers/",
                        json={"device_variant": variant.pk, "price": self._price(variant, store_index),
                              "quantity": [0, 1, 3, 12, 80][(variant.pk + store_index) % 5],
                              "description": "Simulation-owned marketplace offer."},
                        expected=201,
                    )
                    if response.status_code != 201:
                        raise RuntimeError(f"Offer API creation failed: {response.payload}")
                    offer = Offer.objects.get(pk=_payload_id(response.payload))
                    record(self.run, offer, identity_marker=f"sim-{self.run.run_id}")
                    all_rows.append(offer.pk)
                missing = missing[api_count:]
            if self.mode != "api":
                for variant in missing:
                    offer = Offer.objects.create(
                        store=store, device_variant=variant,
                        price=self._price(variant, store_index),
                        quantity=[0, 1, 2, 5, 25, 120][(variant.pk + store_index) % 6],
                        description="Simulation-owned marketplace offer.",
                    )
                    record(self.run, offer, identity_marker=f"sim-{self.run.run_id}")
                    all_rows.append(offer.pk)
        self.manifest["offer_ids"] = all_rows
        self._complete("offers_created", {"approved_store_offer_counts": {
            str(store.pk): store.offers.count() for store in Store.objects.filter(pk__in=[r["store_id"] for r in approved])
        }})

    def create_customers(self):
        if self._stage_done("customers_created"):
            return
        client = self._client()
        rows = []
        for index in range(1, 11):
            username = f"sim-{self.run.run_id}-market-customer-{index:02d}"
            email = f"customer-{index:02d}@{self.run.run_id}.example.test"
            response = client.register_customer(username, email, _password(self.seed, index))
            if response.status_code != 201:
                raise RuntimeError(f"Customer registration failed for {username}: {response.payload}")
            user = self._find_user(username)
            record(self.run, user, identity_marker=f"sim-{self.run.run_id}")
            record(self.run, user.account_profile)
            rows.append({"username": username, "user_id": user.pk, "index": index})
        self._complete("customers_created", rows)

    def charge_wallets(self):
        if self._stage_done("wallets_charged"):
            return
        # A prior interrupted build may have created offers using an older
        # price range. Normalize only this run's owned offers before wallets
        # and checkout are exercised.
        store_indexes = {
            row["store_id"]: row.get("index", position)
            for position, row in enumerate(self.manifest["reviewed_stores"])
        }
        for offer in Offer.objects.filter(pk__in=self.manifest.get("offer_ids", [])):
            desired = self._price(offer.device_variant, store_indexes.get(offer.store_id, 0))
            if offer.price != desired:
                offer.price = desired
                offer.save(update_fields=["price", "updated_at"])
        client = self._client()
        rows = []
        for row in self.manifest["customers_created"]:
            user = User.objects.get(pk=row["user_id"])
            login = client.login(user.username, _password(self.seed, row["index"]))
            if login.status_code != 200:
                raise RuntimeError(f"Customer login failed: {login.payload}")
            amount = 60_000_000 + row["index"] * 3_000_000
            key = f"{self.run.run_id}-wallet-{row['index']:02d}"
            response = client.request("POST", "/api/wallet/charge/", json={"amount": amount},
                                       headers={"Idempotency-Key": key}, expected=(201, 200))
            replay = client.request("POST", "/api/wallet/charge/", json={"amount": amount},
                                     headers={"Idempotency-Key": key}, expected=200)
            if response.status_code not in {201, 200} or replay.status_code != 200:
                raise RuntimeError(f"Wallet charge/idempotency failed for {user.username}.")
            wallet = Wallet.objects.get(user=user)
            record(self.run, wallet)
            record(self.run, wallet.transactions.order_by("-pk").first())
            rows.append({"user_id": user.pk, "balance": wallet.balance, "idempotency_replayed": True})
        self._complete("wallets_charged", rows)

    def basket_scenarios(self):
        if self._stage_done("basket_scenarios_complete"):
            return
        offers = list(Offer.objects.filter(pk__in=self.manifest["offer_ids"], quantity__gt=0).order_by("pk"))
        if len(offers) < 3:
            raise RuntimeError("At least three in-stock offers are required for basket scenarios.")
        client = self._client()
        rows = []
        for index, row in enumerate(self.manifest["customers_created"]):
            user = User.objects.get(pk=row["user_id"])
            login = client.login(user.username, _password(self.seed, row["index"]))
            if login.status_code != 200:
                raise RuntimeError(f"Customer login failed: {login.payload}")
            offer = offers[index % len(offers)]
            response = client.request("POST", "/api/basket/items/",
                                       json={"offer": offer.pk, "quantity": 1}, expected=201)
            if response.status_code != 201:
                raise RuntimeError(f"Basket add failed: {response.payload}")
            basket = Basket.objects.get(user=user)
            item = basket.items.get(offer=offer)
            record(self.run, basket)
            record(self.run, item)
            # Make the first customer’s checkout genuinely multi-store.
            if index == 0:
                second = next((candidate for candidate in offers
                               if candidate.store_id != offer.store_id and candidate.pk != offer.pk), None)
                if second is None:
                    raise RuntimeError("Could not find a second Store for the multi-store checkout.")
                response = client.request("POST", "/api/basket/items/",
                                           json={"offer": second.pk, "quantity": 1}, expected=201)
                if response.status_code != 201:
                    raise RuntimeError(f"Multi-store basket add failed: {response.payload}")
                second_item = Basket.objects.get(user=user).items.get(offer=second)
                record(self.run, second_item)
            rows.append({"user_id": user.pk, "offer_id": offer.pk, "basket_item_id": item.pk})
        self._complete("basket_scenarios_complete", rows)

    def checkout_scenarios(self):
        if self._stage_done("checkout_scenarios_complete"):
            return
        client = self._client()
        rows = []
        for index, row in enumerate(self.manifest["customers_created"]):
            user = User.objects.get(pk=row["user_id"])
            login = client.login(user.username, _password(self.seed, row["index"]))
            if login.status_code != 200:
                raise RuntimeError(f"Customer login failed: {login.payload}")
            key = f"{self.run.run_id}-checkout-{row['index']:02d}"
            response = client.request("POST", "/api/orders/", json={},
                                       headers={"Idempotency-Key": key}, expected=(201, 409))
            if response.status_code == 201:
                replay = client.request("POST", "/api/orders/", json={},
                                         headers={"Idempotency-Key": key}, expected=200)
                if replay.status_code != 200:
                    raise RuntimeError("Checkout idempotency replay failed.")
            rows.append({"user_id": user.pk, "status": response.status_code,
                         "order_ids": list(Order.objects.filter(basket__user=user).values_list("pk", flat=True))})
        for order in Order.objects.filter(basket__user_id__in=[r["user_id"] for r in self.manifest["customers_created"]]):
            record(self.run, order)
            for item in order.items.all():
                record(self.run, item)
            for tx in order.wallet_transactions.all():
                record(self.run, tx)
        self.manifest["order_ids"] = list(Order.objects.filter(
            basket__user_id__in=[r["user_id"] for r in self.manifest["customers_created"]]
        ).values_list("pk", flat=True))
        self._complete("checkout_scenarios_complete", rows)

    def cancellation_scenarios(self):
        if self._stage_done("cancellation_scenarios_complete"):
            return
        client = self._client()
        paid = list(Order.objects.filter(pk__in=self.manifest.get("order_ids", []), status=Order.Status.PAID)[:2])
        rows = []
        for order in paid:
            user = order.basket.user
            customer_row = next(row for row in self.manifest["customers_created"] if row["user_id"] == user.pk)
            login = client.login(user.username, _password(self.seed, customer_row["index"]))
            if login.status_code != 200:
                raise RuntimeError("Customer login failed for cancellation.")
            response = client.request("POST", f"/api/orders/{order.pk}/cancel/", json={}, expected=200)
            replay = client.request("POST", f"/api/orders/{order.pk}/cancel/", json={}, expected=200)
            if response.status_code != 200 or replay.status_code != 200:
                raise RuntimeError("Cancellation/refund idempotency failed.")
            rows.append({"order_id": order.pk, "refund_replay_status": replay.status_code})
        self._complete("cancellation_scenarios_complete", rows)

    def validate(self):
        if self._stage_done("validated"):
            return self.manifest.get("validation", {})
        approved = Store.objects.filter(pk__in=[r["store_id"] for r in self.manifest["reviewed_stores"]],
                                         status=Store.Status.ACTIVE)
        rejected = Store.objects.filter(pk__in=[r["store_id"] for r in self.manifest["reviewed_stores"]],
                                        status=Store.Status.REJECTED)
        findings = []
        if approved.count() != 5 or rejected.count() != 1:
            findings.append("store_review_cardinality")
        for store in approved:
            count = store.offers.count()
            if not self.offers_min <= count <= self.offers_max:
                findings.append(f"offer_count:{store.pk}:{count}")
            if store.offers.values("device_variant_id").annotate(n=Count("id")).filter(n__gt=1).exists():
                findings.append(f"duplicate_offer:{store.pk}")
        if rejected.filter(offers__isnull=False).exists():
            findings.append("rejected_store_has_offers")
        if Wallet.objects.filter(user_id__in=[r["user_id"] for r in self.manifest["customers_created"]], balance__lt=0).exists():
            findings.append("negative_wallet")
        if Offer.objects.filter(pk__in=self.manifest["offer_ids"], quantity__lt=0).exists():
            findings.append("negative_offer_quantity")
        if WalletTransaction.objects.filter(
            order_id__in=self.manifest.get("order_ids", []),
            transaction_type=WalletTransaction.TransactionType.REFUND,
        ).values("order_id").annotate(n=Count("id")).filter(n__gt=1).exists():
            findings.append("duplicate_refund")
        checkout_rows = self.manifest.get("checkout_scenarios_complete", [])
        if sum(row.get("status") == 201 for row in checkout_rows) < 8:
            findings.append("fewer_than_eight_successful_checkouts")
        multi_store = any(
            Order.objects.filter(pk__in=row.get("order_ids", [])).values("store_id").distinct().count() > 1
            for row in checkout_rows
        )
        if not multi_store:
            findings.append("multi_store_checkout_missing")
        # Permission and dashboard audits use the same public API contracts
        # exercised by the frontend, while the database remains authoritative.
        client = self._client()
        rejected_id = rejected.first().pk if rejected.exists() else None
        if rejected_id is not None:
            public_rejected = client.request("GET", f"/api/stores/{rejected_id}/", expected=404)
            if public_rejected.status_code != 404:
                findings.append("rejected_store_publicly_visible")
        if self.manifest.get("order_ids"):
            first_customer = self.manifest["customers_created"][0]
            client.login(
                User.objects.get(pk=first_customer["user_id"]).username,
                _password(self.seed, first_customer["index"]),
            )
            foreign_order = Order.objects.filter(
                basket__user_id__in=[row["user_id"] for row in self.manifest["customers_created"][1:]]
            ).first()
            foreign = client.request(
                "GET", f"/api/orders/{foreign_order.pk if foreign_order else self.manifest['order_ids'][-1]}/", expected=404
            )
            if foreign.status_code != 404:
                findings.append("cross_customer_order_access")
        dashboard_audit = []
        for store_row in [r for r in self.manifest["reviewed_stores"] if r["status"] == Store.Status.ACTIVE]:
            store = Store.objects.get(pk=store_row["store_id"])
            owner = store.account_profile.user
            login = client.login(owner.username, _password(self.seed, 10_000 + next(
                r["index"] for r in self.manifest["registered_stores"] if r["store_id"] == store.pk
            )))
            dashboard = client.request("GET", "/api/stores/me/dashboard/", expected=200)
            expected_total = store.offers.count()
            if dashboard.status_code != 200 or dashboard.payload.get("offers", {}).get("total") != expected_total:
                findings.append(f"dashboard_mismatch:{store.pk}")
            else:
                dashboard_audit.append({"store_id": store.pk, "offer_total": expected_total})
        result = {"passed": not findings, "findings": findings,
                  "approved_stores": approved.count(), "rejected_stores": rejected.count(),
                  "customers": len(self.manifest["customers_created"]),
                  "offers": sum(s.offers.count() for s in approved),
                  "orders": Order.objects.filter(pk__in=self.manifest.get("order_ids", [])).count(),
                  "dashboard_audit": dashboard_audit}
        self.manifest["validation"] = result
        self._complete("validated", result)
        return result

    def run_all(self):
        self._ensure_run()
        self.register_stores()
        self.review_stores()
        self.catalog_ready()
        self.create_offers()
        self.create_customers()
        self.charge_wallets()
        self.basket_scenarios()
        self.checkout_scenarios()
        self.cancellation_scenarios()
        result = self.validate()
        self.run.status = SimulationRun.Status.COMPLETED if result["passed"] else SimulationRun.Status.FAILED
        self.run.finished_at = timezone.now()
        self.run.created_counts = {
            "stores": 6, "approved_stores": result["approved_stores"],
            "rejected_stores": result["rejected_stores"], "customers": result["customers"],
            "offers": result["offers"], "orders": result["orders"],
        }
        self.run.failure_summary = {"findings": result["findings"]}
        self.run.save(update_fields=["status", "finished_at", "created_counts", "failure_summary", "updated_at"])
        return self.manifest
