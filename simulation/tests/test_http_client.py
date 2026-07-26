from django.test import SimpleTestCase

from simulation.http.client import ApiClient


class FakeResponse:
    status_code = 200
    headers = {"Content-Type": "application/json"}
    text = ""

    def json(self):
        return {"access": "access-token"}


class FakeSession:
    def __init__(self):
        self.calls = []
        self.cookies = {}

    def request(self, **kwargs):
        self.calls.append(kwargs)
        return FakeResponse()


class HttpClientTests(SimpleTestCase):
    def test_login_keeps_access_in_memory_and_sends_bearer_afterward(self):
        session = FakeSession()
        client = ApiClient("http://127.0.0.1:8000", session=session)
        client.login("customer", "password")
        client.request("GET", "/api/auth/me/")
        self.assertEqual(client.access_token, "access-token")
        self.assertEqual(
            session.calls[-1]["headers"]["Authorization"],
            "Bearer access-token",
        )

    def test_base_url_and_expected_status_are_recorded(self):
        session = FakeSession()
        client = ApiClient("http://127.0.0.1:8000/", session=session)
        response = client.request("GET", "/api/stores/", expected=201)
        self.assertEqual(response.path, "/api/stores/")
        self.assertEqual(response.error, "expected_status_[201]")
