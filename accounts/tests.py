from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import AccountProfile
from marketplace.models import Store


class CookieAuthenticationTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.customer = user_model.objects.create_user(
            username="customer", password="Strong-pass-123", email="customer@example.test"
        )
        AccountProfile.objects.create(user=self.customer, account_type=AccountProfile.AccountType.CUSTOMER)
        self.store_user = user_model.objects.create_user(
            username="store", password="Strong-pass-123", email="store@example.test"
        )
        store_profile = AccountProfile.objects.create(
            user=self.store_user, account_type=AccountProfile.AccountType.STORE
        )
        Store.objects.create(
            account_profile=store_profile,
            name="Store", slug="store", business_phone="123", address="address"
        )
        self.staff = user_model.objects.create_user(username="staff", password="Strong-pass-123", is_staff=True)
        self.login_url = reverse("login")
        self.refresh_url = reverse("token-refresh")
        self.logout_url = reverse("logout")
        self.me_url = reverse("current-user")

    def login(self, username="customer", password="Strong-pass-123"):
        return self.client.post(self.login_url, {"username": username, "password": password}, format="json")

    def test_login_returns_access_only_and_sets_securely_scoped_refresh_cookie(self):
        response = self.login()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data), {"access"})
        cookie = response.cookies["torob_phone_refresh"]
        self.assertTrue(cookie["httponly"])
        self.assertEqual(cookie["path"], "/api/auth/")
        self.assertEqual(cookie["samesite"], "Lax")
        self.assertEqual(cookie["secure"], "")

    def test_invalid_credentials_do_not_set_refresh_cookie(self):
        response = self.login(password="wrong")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertNotIn("torob_phone_refresh", response.cookies)

    def test_refresh_uses_cookie_rotates_it_and_rejects_body_only_token(self):
        login_response = self.login()
        old_refresh = login_response.cookies["torob_phone_refresh"].value
        self.client.cookies["torob_phone_refresh"] = old_refresh
        response = self.client.post(self.refresh_url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data), {"access"})
        rotated_refresh = response.cookies["torob_phone_refresh"].value
        self.assertNotEqual(old_refresh, rotated_refresh)

        self.client.cookies.clear()
        response = self.client.post(self.refresh_url, {"refresh": rotated_refresh}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "refresh_cookie_missing")

    def test_refresh_errors_are_controlled_and_origin_is_checked(self):
        response = self.client.post(self.refresh_url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "refresh_cookie_missing")

        self.client.cookies["torob_phone_refresh"] = "invalid"
        response = self.client.post(self.refresh_url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "refresh_token_invalid")

        self.client.cookies["torob_phone_refresh"] = str(RefreshToken.for_user(self.customer))
        response = self.client.post(self.refresh_url, {}, HTTP_ORIGIN="https://untrusted.example")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["code"], "csrf_origin_invalid")

    def test_logout_blacklists_refresh_clears_cookie_and_is_idempotent(self):
        refresh = str(RefreshToken.for_user(self.customer))
        self.client.cookies["torob_phone_refresh"] = refresh
        response = self.client.post(self.logout_url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["detail"], "Logged out successfully.")
        self.assertEqual(response.cookies["torob_phone_refresh"]["max-age"], 0)

        self.client.cookies["torob_phone_refresh"] = refresh
        response = self.client.post(self.refresh_url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "refresh_token_invalid")

        self.client.cookies.clear()
        response = self.client.post(self.logout_url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_refreshed_access_token_preserves_customer_store_and_staff_me_responses(self):
        response = self.login()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")
        response = self.client.get(self.me_url)
        self.assertEqual(response.data["account_type"], AccountProfile.AccountType.CUSTOMER)

        response = self.login("store")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")
        response = self.client.get(self.me_url)
        self.assertEqual(response.data["account_type"], AccountProfile.AccountType.STORE)

        response = self.login("staff")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data["account_type"])
        self.assertIsNone(response.data["created_at"])

    @override_settings(CORS_ALLOWED_ORIGINS=["http://localhost:3000"], JWT_AUTH_TRUSTED_ORIGINS={"http://localhost:3000"})
    def test_configured_origin_allows_credentials_without_wildcard_cors(self):
        response = self.client.options(self.login_url, HTTP_ORIGIN="http://localhost:3000", HTTP_ACCESS_CONTROL_REQUEST_METHOD="POST")
        self.assertEqual(response["Access-Control-Allow-Origin"], "http://localhost:3000")
        self.assertEqual(response["Access-Control-Allow-Credentials"], "true")
        self.assertNotEqual(getattr(__import__("django.conf").conf.settings, "CORS_ALLOW_ALL_ORIGINS", False), True)
