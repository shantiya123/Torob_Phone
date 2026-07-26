"""Store and offer serializers.

Implements docs/Serializers.md sections 5 (Store Serializers),
6 (Store Review Serializers), and 7 (Offer Serializers).

Store representations are split by audience so that private legal/review
data never leaks into a public or store-owner response:

* ``StorePublicListSerializer`` / ``StorePublicDetailSerializer`` - public.
* ``StoreOwnerSerializer`` - the authenticated store owner's own store.
* ``StoreLegalProfileSerializer`` - private legal/business information.
* ``StoreReviewSerializer`` - staff-only review workflow.

Offer serializers keep ``store``, ``available``, and timestamps backend-
controlled, and never let a client duplicate catalog technical data onto a
marketplace model.
"""

from django.db import transaction
from rest_framework import serializers
from drf_spectacular.utils import OpenApiTypes, extend_schema_field

from catalog.models import DeviceVariant
from catalog.serializers import DeviceVariantListSerializer

from .models import Offer, Store, StoreLegalProfile


# --------------------------------------------------------------------------
# Store serializers
# --------------------------------------------------------------------------


class PublicStoreSummarySerializer(serializers.ModelSerializer):
    """Compact identity safe for public Offers, baskets, and orders."""

    class Meta:
        model = Store
        fields = ["id", "name", "slug", "logo"]
        read_only_fields = fields


class StorePublicListSerializer(PublicStoreSummarySerializer):
    """Minimal public information for the store list. See 5.1."""


class StorePublicDetailSerializer(serializers.ModelSerializer):
    """Public information about one store. See 5.2.

    Deliberately excludes StoreLegalProfile and all review metadata
    (``reviewed_by``, ``reviewed_at``, ``rejection_reason``).
    """

    class Meta:
        model = Store
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "logo",
            "created_at",
        ]
        read_only_fields = fields


class StoreOwnerSerializer(serializers.ModelSerializer):
    """Lets the authenticated store owner view/update their own store. See 5.3.

    ``account_profile``, ``status``, ``reviewed_by``, ``reviewed_at``, and
    ``rejection_reason`` are read-only: the owner can edit their public
    profile but cannot change ownership or approve their own store.
    """

    class Meta:
        model = Store
        fields = [
            "id",
            "account_profile",
            "name",
            "slug",
            "description",
            "logo",
            "business_phone",
            "business_email",
            "address",
            "status",
            "reviewed_by",
            "reviewed_at",
            "rejection_reason",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "account_profile",
            "slug",
            "status",
            "reviewed_by",
            "reviewed_at",
            "rejection_reason",
            "created_at",
            "updated_at",
        ]


class StoreLegalProfileSerializer(serializers.ModelSerializer):
    """Represents private legal/business information. See 5.4.

    Must not be used to build public store responses. The view layer is
    responsible for restricting access to the owning store or staff.
    """

    class Meta:
        model = StoreLegalProfile
        fields = [
            "id",
            "store",
            "legal_name",
            "business_type",
            "business_registration_number",
            "national_identifier",
            "tax_identifier",
            "legal_representative_name",
            "legal_representative_national_identifier",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "store", "created_at", "updated_at"]


class StoreReviewSerializer(serializers.ModelSerializer):
    """Staff-only administrative review workflow. See section 6.

    Enforces valid status transitions and assigns ``reviewed_by`` /
    ``reviewed_at`` from the requesting staff user rather than accepting
    them as client input.
    """

    _VALID_TRANSITIONS = {
        Store.Status.PENDING: {Store.Status.ACTIVE, Store.Status.REJECTED},
        Store.Status.REJECTED: {Store.Status.PENDING},
        Store.Status.ACTIVE: set(),
    }

    class Meta:
        model = Store
        fields = ["id", "status", "rejection_reason", "reviewed_by", "reviewed_at"]
        read_only_fields = ["id", "reviewed_by", "reviewed_at"]

    def validate(self, attrs):
        new_status = attrs.get("status")
        if new_status is None:
            return attrs

        current_status = self.instance.status if self.instance else Store.Status.PENDING
        allowed = self._VALID_TRANSITIONS.get(current_status, set())
        if new_status != current_status and new_status not in allowed:
            raise serializers.ValidationError(
                {"status": f"Cannot transition from '{current_status}' to '{new_status}'."}
            )

        if new_status == Store.Status.REJECTED and not attrs.get("rejection_reason"):
            raise serializers.ValidationError(
                {"rejection_reason": "A rejection reason is required when rejecting a store."}
            )

        return attrs

    def update(self, instance, validated_data):
        request = self.context.get("request")
        instance.status = validated_data.get("status", instance.status)
        instance.rejection_reason = validated_data.get("rejection_reason", instance.rejection_reason)
        if request is not None and request.user is not None:
            instance.reviewed_by = request.user
        from django.utils import timezone

        instance.reviewed_at = timezone.now()
        instance.save(update_fields=["status", "rejection_reason", "reviewed_by", "reviewed_at", "updated_at"])
        return instance


class _StaffUserSummarySerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    username = serializers.CharField(read_only=True)


class _StaffStoreOwnerSerializer(_StaffUserSummarySerializer):
    email = serializers.EmailField(read_only=True)
    account_type = serializers.CharField(source="account_profile.account_type", read_only=True)
    created_at = serializers.DateTimeField(source="account_profile.created_at", read_only=True)


class StoreReviewQueueSerializer(serializers.ModelSerializer):
    """Concise, staff-only review queue representation."""

    owner = _StaffStoreOwnerSerializer(source="account_profile.user", read_only=True)
    legal_name = serializers.CharField(source="legal_profile.legal_name", read_only=True)
    business_type = serializers.CharField(source="legal_profile.business_type", read_only=True)

    class Meta:
        model = Store
        fields = [
            "id", "name", "slug", "status", "owner", "legal_name", "business_type",
            "created_at", "reviewed_at",
        ]
        read_only_fields = fields


class StoreReviewDetailSerializer(serializers.ModelSerializer):
    """Full private registration data for staff review only."""

    owner = _StaffStoreOwnerSerializer(source="account_profile.user", read_only=True)
    legal_profile = StoreLegalProfileSerializer(read_only=True)
    reviewed_by = _StaffUserSummarySerializer(read_only=True)

    class Meta:
        model = Store
        fields = [
            "id", "name", "slug", "description", "logo", "business_phone", "business_email",
            "address", "status", "owner", "legal_profile", "reviewed_by", "reviewed_at",
            "rejection_reason", "created_at", "updated_at",
        ]
        read_only_fields = fields


class StoreReviewRejectSerializer(serializers.Serializer):
    rejection_reason = serializers.CharField(trim_whitespace=True, allow_blank=False)


# --------------------------------------------------------------------------
# Offer serializers
# --------------------------------------------------------------------------


class OfferListSerializer(serializers.ModelSerializer):
    """Represents an offer in a list of offers for a DeviceVariant. See 7.1."""

    store = PublicStoreSummarySerializer(read_only=True)
    device_variant = DeviceVariantListSerializer(read_only=True)
    available = serializers.BooleanField(source="is_available", read_only=True)

    class Meta:
        model = Offer
        fields = ["id", "device_variant", "store", "price", "quantity", "available", "description"]
        read_only_fields = fields


class OfferDetailSerializer(serializers.ModelSerializer):
    """Represents one public offer. See 7.2.

    Private store information (legal profile, review metadata) is never
    exposed here; ``store`` uses the public store serializer.
    """

    store = PublicStoreSummarySerializer(read_only=True)
    device_variant = DeviceVariantListSerializer(read_only=True)
    available = serializers.BooleanField(source="is_available", read_only=True)

    class Meta:
        model = Offer
        fields = [
            "id",
            "device_variant",
            "store",
            "price",
            "quantity",
            "available",
            "description",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class StoreOperationalOfferSerializer(serializers.ModelSerializer):
    """Store-owner offer representation with derived visibility state."""

    store = PublicStoreSummarySerializer(read_only=True)
    device_variant = DeviceVariantListSerializer(read_only=True)
    publicly_available = serializers.SerializerMethodField()
    availability_reason = serializers.SerializerMethodField()

    class Meta:
        model = Offer
        fields = [
            "id", "device_variant", "store", "price", "quantity",
            "publicly_available", "availability_reason", "updated_at",
        ]
        read_only_fields = fields

    @extend_schema_field(OpenApiTypes.BOOL)
    def get_publicly_available(self, obj):
        return (
            obj.store.status == Store.Status.ACTIVE
            and obj.quantity > 0
            and obj.device_variant.is_available
            and obj.device_variant.device_model.is_catalog_eligible
        )

    @extend_schema_field(OpenApiTypes.STR)
    def get_availability_reason(self, obj):
        if obj.store.status != Store.Status.ACTIVE:
            return "store_not_active"
        if obj.quantity <= 0:
            return "out_of_stock"
        if not obj.device_variant.is_available:
            return "variant_unavailable"
        if not obj.device_variant.device_model.is_catalog_eligible:
            return "device_not_catalog_eligible"
        return None


class OfferCreateSerializer(serializers.ModelSerializer):
    """Creates an offer for the authenticated store. See 7.3.

    ``store`` is determined from ``request.user``'s store, never accepted
    from the client. Does not create a new catalog product: ``device_variant``
    must reference an existing ``DeviceVariant``.
    """

    device_variant = serializers.PrimaryKeyRelatedField(queryset=DeviceVariant.objects.all())

    class Meta:
        model = Offer
        fields = ["id", "device_variant", "price", "quantity", "description"]
        read_only_fields = ["id"]

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("Price must be a positive integer.")
        return value

    def validate_quantity(self, value):
        if value < 0:
            raise serializers.ValidationError("Quantity must not be negative.")
        return value

    def validate(self, attrs):
        request = self.context.get("request")
        store = getattr(getattr(request, "user", None), "account_profile", None)
        store = getattr(store, "store", None) if store else None
        if store is None:
            raise serializers.ValidationError("Only an authenticated store account can create offers.")
        if store.status != Store.Status.ACTIVE:
            raise serializers.ValidationError("Only an active store can create offers.")
        if Offer.objects.filter(store=store, device_variant=attrs["device_variant"]).exists():
            raise serializers.ValidationError(
                {"device_variant": "This store already has an offer for this device variant."}
            )
        attrs["store"] = store
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        return Offer.objects.create(**validated_data)


class OfferUpdateSerializer(serializers.ModelSerializer):
    """Allows the owning store to update permitted offer fields. See 7.4.

    ``store``, ``device_variant``, ``available``, and timestamps are not
    writable. Selling a different variant requires a separate offer, not an
    update to this one.
    """

    class Meta:
        model = Offer
        fields = ["id", "price", "quantity", "description"]
        read_only_fields = ["id"]

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("Price must be a positive integer.")
        return value

    def validate_quantity(self, value):
        if value < 0:
            raise serializers.ValidationError("Quantity must not be negative.")
        return value
