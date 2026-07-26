from dataclasses import dataclass, field
from time import perf_counter
from urllib.parse import urljoin

import requests


@dataclass
class HttpResponse:
    method: str
    path: str
    status_code: int
    payload: object
    elapsed_ms: float
    headers: dict = field(default_factory=dict)
    error: str | None = None


class ApiClient:
    """Cookie-aware HTTP client with in-memory access-token handling."""

    def __init__(self, base_url, *, timeout=15, session=None):
        self.base_url = base_url.rstrip("/") + "/"
        self.timeout = timeout
        self.session = session or requests.Session()
        self.access_token = None

    def _url(self, path):
        return urljoin(self.base_url, path.lstrip("/"))

    def _headers(self, headers=None):
        result = {"Accept": "application/json"}
        if self.access_token:
            result["Authorization"] = f"Bearer {self.access_token}"
        if headers:
            result.update(headers)
        return result

    def request(self, method, path, *, json=None, headers=None, expected=None):
        started = perf_counter()
        try:
            response = self.session.request(
                method=method,
                url=self._url(path),
                json=json,
                headers=self._headers(headers),
                timeout=self.timeout,
            )
            try:
                payload = response.json()
            except ValueError:
                payload = response.text
            error = None
        except requests.RequestException as exc:
            return HttpResponse(
                method=method,
                path=path,
                status_code=0,
                payload=None,
                elapsed_ms=(perf_counter() - started) * 1000,
                error=type(exc).__name__,
            )
        result = HttpResponse(
            method=method,
            path=path,
            status_code=response.status_code,
            payload=payload,
            elapsed_ms=(perf_counter() - started) * 1000,
            headers=dict(response.headers),
            error=error,
        )
        if expected is not None:
            expected_values = {expected} if isinstance(expected, int) else set(expected)
            if result.status_code not in expected_values:
                result.error = f"expected_status_{sorted(expected_values)}"
        return result

    def login(self, username, password):
        response = self.request(
            "POST",
            "/api/auth/login/",
            json={"username": username, "password": password},
            expected=200,
        )
        if response.status_code == 200 and isinstance(response.payload, dict):
            self.access_token = response.payload.get("access")
        return response

    def refresh(self):
        response = self.request("POST", "/api/auth/token/refresh/", json={}, expected=200)
        if response.status_code == 200 and isinstance(response.payload, dict):
            self.access_token = response.payload.get("access")
        return response

    def logout(self):
        response = self.request("POST", "/api/auth/logout/", json={}, expected=200)
        self.access_token = None
        return response

    def register_customer(self, username, email, password):
        return self.request(
            "POST",
            "/api/auth/register/",
            json={
                "account_type": "customer",
                "username": username,
                "email": email,
                "password": password,
            },
            expected=201,
        )

    def register_store_profile(self, username, email, password, *, name, index):
        """Register a store applicant through the public registration API."""
        return self.request(
            "POST",
            "/api/auth/register/",
            json={
                "account_type": "store",
                "username": username,
                "email": email,
                "password": password,
                "store": {
                    "name": name,
                    "description": f"Simulation-owned marketplace applicant {index}.",
                    "business_phone": f"+000-SIM-{index:04d}",
                    "business_email": email,
                    "address": f"Synthetic simulation address {index}.",
                },
                "legal_profile": {
                    "legal_name": f"{name} Legal Entity",
                    "business_type": "company",
                    "business_registration_number": f"SIM-REG-{index:04d}",
                    "national_identifier": f"SIM-NI-{index:04d}",
                    "tax_identifier": f"SIM-TAX-{index:04d}",
                    "legal_representative_name": f"Simulation Representative {index}",
                    "legal_representative_national_identifier": f"SIM-RN-{index:04d}",
                },
            },
            expected=201,
        )

    def register_store(self, username, email, password, index):
        return self.request(
            "POST",
            "/api/auth/register/",
            json={
                "account_type": "store",
                "username": username,
                "email": email,
                "password": password,
                "store": {
                    "name": f"HTTP Simulation Store {index}",
                    "business_phone": f"+000-HTTP-{index:04d}",
                    "business_email": email,
                    "address": f"Synthetic HTTP address {index}",
                },
                "legal_profile": {
                    "legal_name": f"HTTP Simulation Legal {index}",
                    "business_type": "synthetic",
                    "legal_representative_name": f"HTTP Representative {index}",
                },
            },
            expected=201,
        )
