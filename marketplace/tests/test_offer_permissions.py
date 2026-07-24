from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import AccountProfile
from catalog.models import Brand, DeviceModel, DeviceVariant
from marketplace.models import Offer, Store


class OfferPermissionTests(APITestCase):
    def setUp(self):
        brand = Brand.objects.create(name="Test", slug="test")
        model = DeviceModel.objects.create(brand=brand, model_name="Phone", model_key="phone")
        self.variant = DeviceVariant.objects.create(
            device_model=model, configuration_key="8-128", ram_gb=8, storage_gb=128
        )

    def make_store(self, username, store_status):
        user = get_user_model().objects.create_user(username=username, password="pass")
        profile = AccountProfile.objects.create(user=user, account_type=AccountProfile.AccountType.STORE)
        return user, Store.objects.create(
            account_profile=profile, name=username, slug=username, business_phone="1",
            address="address", status=store_status,
        )

    def test_only_active_store_can_create_update_or_delete_offers(self):
        active_user, active_store = self.make_store("active", Store.Status.ACTIVE)
        offer = Offer.objects.create(store=active_store, device_variant=self.variant, price=100, quantity=1)
        for name, store_status in (("pending", Store.Status.PENDING), ("suspended", Store.Status.SUSPENDED)):
            user, _ = self.make_store(name, store_status)
            self.client.force_authenticate(user)
            response = self.client.post("/api/offers/", {"device_variant": self.variant.pk, "price": 100, "quantity": 1})
            self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(active_user)
        self.assertEqual(self.client.patch(f"/api/offers/{offer.pk}/", {"price": 101}).status_code, status.HTTP_200_OK)
        active_store.status = Store.Status.SUSPENDED
        active_store.save()
        self.assertEqual(self.client.patch(f"/api/offers/{offer.pk}/", {"price": 102}).status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.delete(f"/api/offers/{offer.pk}/").status_code, status.HTTP_403_FORBIDDEN)
