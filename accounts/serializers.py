"""Authentication and account serializers.

Implements docs/Serializers.md sections 3 (Authentication Serializers) and
4 (AccountProfile Serializers):

* ``CustomerRegistrationSerializer`` - creates a CUSTOMER account.
* ``StoreRegistrationSerializer`` - creates a STORE account together with its
  Store and StoreLegalProfile in one atomic operation.
* ``CurrentUserSerializer`` - represents the authenticated user's own account.
* ``AccountProfileSerializer`` - represents account type and profile metadata.

None of these serializers accept ``is_staff``, ``is_superuser``, ``groups``,
``user_permissions``, ``account_type`` (post-registration), or Store review
fields (``status``, ``reviewed_by``, ``reviewed_at``, ``rejection_reason``)
as client input. Each serializer only declares the fields it is meant to
accept; anything not declared is never read from client input, regardless of
what the request body contains.
"""

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from django.utils.text import slugify
from drf_spectacular.utils import OpenApiTypes, extend_schema_field
from rest_framework import serializers

from accounts.models import AccountProfile
from marketplace.models import Store, StoreLegalProfile

User = get_user_model()


def _unique_store_slug(name):
    """Generate a unique slug for a new Store from its display name."""
    base_slug = slugify(name, allow_unicode=True) or "store"
    slug = base_slug
    suffix = 1
    while Store.objects.filter(slug=slug).exists():
        suffix += 1
        slug = f"{base_slug}-{suffix}"
    return slug


class CustomerRegistrationSerializer(serializers.Serializer):
    """Creates a CUSTOMER account. See docs/Serializers.md 3.1."""

    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate_password(self, value):
        validate_password(value)
        return value

    @transaction.atomic
    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
        )
        account_profile = AccountProfile.objects.create(
            user=user,
            account_type=AccountProfile.AccountType.CUSTOMER,
        )
        return account_profile

    def to_representation(self, instance):
        return {
            "id": instance.user_id,
            "username": instance.user.username,
            "email": instance.user.email,
            "account_type": instance.account_type,
        }


class _StoreRegistrationStoreSerializer(serializers.Serializer):
    """Nested store fields accepted during store registration."""

    name = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    business_phone = serializers.CharField(max_length=32)
    business_email = serializers.EmailField(required=False, allow_null=True)
    address = serializers.CharField()


class _StoreRegistrationLegalProfileSerializer(serializers.Serializer):
    """Nested legal-profile fields accepted during store registration."""

    legal_name = serializers.CharField(max_length=255)
    business_type = serializers.CharField(max_length=100)
    business_registration_number = serializers.CharField(
        max_length=100, required=False, allow_blank=True, allow_null=True
    )
    national_identifier = serializers.CharField(
        max_length=100, required=False, allow_blank=True, allow_null=True
    )
    tax_identifier = serializers.CharField(
        max_length=100, required=False, allow_blank=True, allow_null=True
    )
    legal_representative_name = serializers.CharField(max_length=255)
    legal_representative_national_identifier = serializers.CharField(
        max_length=100, required=False, allow_blank=True, allow_null=True
    )


class StoreRegistrationSerializer(serializers.Serializer):
    """Creates a STORE account, Store, and StoreLegalProfile atomically.

    See docs/Serializers.md 3.2. The initial Store status is always
    ``PENDING`` and is not accepted from client input. ``reviewed_by``,
    ``reviewed_at``, and ``rejection_reason`` are never accepted here.
    """

    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    store = _StoreRegistrationStoreSerializer()
    legal_profile = _StoreRegistrationLegalProfileSerializer()

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate_password(self, value):
        validate_password(value)
        return value

    @transaction.atomic
    def create(self, validated_data):
        store_data = validated_data.pop("store")
        legal_data = validated_data.pop("legal_profile")

        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
        )
        account_profile = AccountProfile.objects.create(
            user=user,
            account_type=AccountProfile.AccountType.STORE,
        )
        store = Store.objects.create(
            account_profile=account_profile,
            slug=_unique_store_slug(store_data["name"]),
            status=Store.Status.PENDING,
            **store_data,
        )
        StoreLegalProfile.objects.create(store=store, **legal_data)
        return account_profile

    def to_representation(self, instance):
        store = instance.store
        return {
            "id": instance.user_id,
            "username": instance.user.username,
            "email": instance.user.email,
            "account_type": instance.account_type,
            "store": {
                "id": store.id,
                "name": store.name,
                "slug": store.slug,
                "status": store.status,
            },
        }


class CurrentUserSerializer(serializers.ModelSerializer):
    """Represents the authenticated user's own account. See 3.3.

    Only ``email`` is writable. ``account_type``, ``is_staff``,
    ``is_superuser``, ``groups``, and ``user_permissions`` are read-only
    identity/authorization signals and cannot be modified through it.
    """

    account_type = serializers.SerializerMethodField()
    created_at = serializers.SerializerMethodField()
    is_staff = serializers.BooleanField(read_only=True)
    is_superuser = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "is_staff", "is_superuser",
            "account_type", "created_at",
        ]
        read_only_fields = [
            "id", "username", "is_staff", "is_superuser",
            "account_type", "created_at",
        ]

    @extend_schema_field(OpenApiTypes.STR)
    def get_account_type(self, instance):
        profile = getattr(instance, "account_profile", None)
        return profile.account_type if profile is not None else None

    @extend_schema_field(OpenApiTypes.DATETIME)
    def get_created_at(self, instance):
        profile = getattr(instance, "account_profile", None)
        return profile.created_at if profile is not None else None


class AccessTokenResponseSerializer(serializers.Serializer):
    access = serializers.CharField(read_only=True)


class RefreshCookieErrorSerializer(serializers.Serializer):
    code = serializers.CharField()
    detail = serializers.CharField()


class LogoutResponseSerializer(serializers.Serializer):
    detail = serializers.CharField()


class AccountProfileSerializer(serializers.ModelSerializer):
    """Represents account type and profile metadata. See 4.1.

    ``account_type`` is set once at registration and is read-only here; a
    role transition would require a dedicated business workflow, which this
    serializer does not implement.
    """

    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = AccountProfile
        fields = ["id", "username", "account_type", "created_at", "updated_at"]
        read_only_fields = fields
