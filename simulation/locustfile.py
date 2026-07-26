"""Configurable Locust profiles for a dedicated simulation environment.

Credentials are supplied through environment variables and are never printed.
The default users perform bounded reads and deterministic search requests;
financial mutations are intentionally excluded from load traffic.
"""

import os
import random

from locust import HttpUser, between, task


def _env(name, default=""):
    return os.getenv(name, default).strip()


class AnonymousBrowseUser(HttpUser):
    wait_time = between(1, 4)
    weight = 5

    @task(5)
    def list_stores(self):
        self.client.get("/api/stores/", name="GET /api/stores/")

    @task(3)
    def list_catalog_variants(self):
        variant_id = _env("SIMULATION_PUBLIC_VARIANT_ID")
        if variant_id:
            self.client.get(
                f"/api/catalog/device-variants/{variant_id}/",
                name="GET /api/catalog/device-variants/{id}/",
            )

    @task(2)
    def list_store_offers(self):
        store_id = _env("SIMULATION_ACTIVE_STORE_ID")
        if store_id:
            self.client.get(
                f"/api/stores/{store_id}/offers/",
                name="GET /api/stores/{id}/offers/",
            )


class CustomerBrowseUser(HttpUser):
    wait_time = between(1, 5)
    weight = 4

    def on_start(self):
        self.username = _env("SIMULATION_CUSTOMER_USERNAME")
        self.password = _env("SIMULATION_CUSTOMER_PASSWORD")
        if self.username and self.password:
            response = self.client.post(
                "/api/auth/login/",
                json={"username": self.username, "password": self.password},
                name="POST /api/auth/login/",
            )
            if response.ok:
                self.client.headers.update(
                    {"Authorization": f"Bearer {response.json().get('access', '')}"}
                )

    @task(4)
    def browse_wallet(self):
        self.client.get("/api/wallet/", name="GET /api/wallet/")

    @task(3)
    def browse_orders(self):
        self.client.get("/api/orders/", name="GET /api/orders/")

    @task(2)
    def read_basket(self):
        self.client.get("/api/basket/", name="GET /api/basket/")

    @task(2)
    def search(self):
        self.client.post(
            "/api/search/",
            json={"message": "show available phones"},
            name="POST /api/search/",
        )


class StoreBrowseUser(HttpUser):
    wait_time = between(1, 5)
    weight = 2

    def on_start(self):
        username = _env("SIMULATION_STORE_USERNAME")
        password = _env("SIMULATION_STORE_PASSWORD")
        if username and password:
            response = self.client.post(
                "/api/auth/login/",
                json={"username": username, "password": password},
                name="POST /api/auth/login/",
            )
            if response.ok:
                self.client.headers.update(
                    {"Authorization": f"Bearer {response.json().get('access', '')}"}
                )

    @task(4)
    def dashboard(self):
        self.client.get("/api/stores/me/dashboard/", name="GET /api/stores/me/dashboard/")

    @task(3)
    def offers(self):
        self.client.get("/api/stores/me/offers/", name="GET /api/stores/me/offers/")

    @task(2)
    def catalog(self):
        self.client.get("/api/catalog/phones/", name="GET /api/catalog/phones/")

    @task(1)
    def orders(self):
        self.client.get("/api/stores/me/orders/", name="GET /api/stores/me/orders/")


class StaffReviewUser(HttpUser):
    wait_time = between(2, 6)
    weight = 1

    def on_start(self):
        username = _env("SIMULATION_STAFF_USERNAME")
        password = _env("SIMULATION_STAFF_PASSWORD")
        if username and password:
            response = self.client.post(
                "/api/auth/login/",
                json={"username": username, "password": password},
                name="POST /api/auth/login/",
            )
            if response.ok:
                self.client.headers.update(
                    {"Authorization": f"Bearer {response.json().get('access', '')}"}
                )

    @task(5)
    def review_queue(self):
        self.client.get("/api/staff/store-reviews/", name="GET /api/staff/store-reviews/")

    @task(2)
    def search_queue(self):
        self.client.get(
            "/api/staff/store-reviews/?status=pending",
            name="GET /api/staff/store-reviews/?status=pending",
        )
