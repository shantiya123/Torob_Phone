from django.conf import settings
from django.db import models


class AccountProfile(models.Model):
    """Identity and account-type record for a Django ``User``.

    Every user has exactly one role: ``CUSTOMER`` or ``STORE``. There is no
    undefined/default account type — it must be chosen explicitly at signup.
    """

    class AccountType(models.TextChoices):
        CUSTOMER = "customer", "Customer"
        STORE = "store", "Store"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="account_profile"
    )
    account_type = models.CharField(max_length=20, choices=AccountType)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user} ({self.account_type})"
