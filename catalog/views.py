from django.db.models import F, Min, Prefetch, Q
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import OpenApiExample, OpenApiParameter, OpenApiTypes, extend_schema

from api_pagination import StandardResultsSetPagination
from api_permissions import IsStoreCatalogUser, IsTorobcheUser
from marketplace.models import Store

from .filtering import filter_catalog
from .ai.explanation_service import ExplanationService
from .ai.serializers import AIProductExplanationSerializer
from .llm_provider import GapGptProvider, LLMProviderError
from .models import DeviceModel, DeviceVariant
from .query_adapter import (
    UnsupportedQuerySetFieldError,
    normalize_query_set,
    query_set_to_filter_requirements,
)
from .query_service import QuerySetModificationService
from .query_set import QuerySetValidationError
from .query_set import empty_query_set
from .query_set_storage import (
    get_saved_query_set,
    get_saved_query_set_state,
    has_active_filters,
    reset_query_set,
    save_query_set,
)
from .serializers import (
    DeviceVariantDetailSerializer,
    ExplanationResponseSerializer,
    SearchRequestSerializer,
    SearchResultSerializer,
    StoreCatalogPhoneDetailSerializer,
    StoreCatalogPhoneSerializer,
    TorobcheResetResponseSerializer,
    TorobcheSearchResponseSerializer,
    TorobcheStateResponseSerializer,
)

import logging
logger = logging.getLogger(__name__)



class StoreCatalogPhoneListView(generics.ListAPIView):
    """Paginated parent-phone browser used while a Store creates an offer."""

    permission_classes = [IsStoreCatalogUser]
    serializer_class = StoreCatalogPhoneSerializer
    pagination_class = StandardResultsSetPagination

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name="search",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description="Case-insensitive match against the phone brand or model.",
                examples=[OpenApiExample("Samsung phones", value="samsung")],
            ),
        ],
        responses=StoreCatalogPhoneSerializer,
        examples=[
            OpenApiExample(
                "Paginated phone list",
                value={
                    "count": 1,
                    "next": None,
                    "previous": None,
                    "results": [{
                        "id": 12,
                        "brand": "Samsung",
                        "model": "Galaxy M47",
                        "image_url": "https://example.test/galaxy-m47.jpg",
                        "release_date": "2026-07-04",
                    }],
                },
                response_only=True,
                status_codes=["200"],
            ),
        ],
        description="Store-only paginated browser of catalog-eligible parent phones. Staff are excluded.",
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        queryset = DeviceModel.objects.select_related("brand").filter(is_catalog_eligible=True)
        search = self.request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(Q(brand__name__icontains=search) | Q(model_name__icontains=search))
        return queryset.order_by("brand__name", "model_name", "pk")


class StoreCatalogPhoneDetailView(generics.RetrieveAPIView):
    """One catalog-eligible parent phone and its available offerable variants."""

    permission_classes = [IsStoreCatalogUser]
    serializer_class = StoreCatalogPhoneDetailSerializer

    @extend_schema(
        responses=StoreCatalogPhoneDetailSerializer,
        examples=[
            OpenApiExample(
                "Phone detail with variants",
                value={
                    "id": 12,
                    "brand": "Samsung",
                    "model": "Galaxy M47",
                    "image_url": "https://example.test/galaxy-m47.jpg",
                    "release_date": "2026-07-04",
                    "variants": [{
                        "id": 31,
                        "ram_gb": 8,
                        "storage_gb": 128,
                        "image_url": "https://example.test/galaxy-m47.jpg",
                    }],
                },
                response_only=True,
                status_codes=["200"],
            ),
        ],
        description="Store-only phone detail. The variants array contains available DeviceVariants, which are the offerable records.",
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        available_variants = DeviceVariant.objects.select_related("device_model__brand").filter(is_available=True)
        return DeviceModel.objects.select_related("brand").prefetch_related(
            Prefetch("variants", queryset=available_variants)
        ).filter(is_catalog_eligible=True)


class SearchView(APIView):
    permission_classes = [IsTorobcheUser]
    pagination_class = StandardResultsSetPagination

    @extend_schema(request=SearchRequestSerializer, responses=TorobcheSearchResponseSerializer)
    def post(self, request):
        request_serializer = SearchRequestSerializer(data=request.data)
        request_serializer.is_valid(raise_exception=True)
        data = request_serializer.validated_data

        saved_query_set = (
            get_saved_query_set(request.user) if request.user.is_authenticated else None
        )
        base_query_set = data.get("query_set") or saved_query_set
        fallback_warning = None
        message = "نتایج بر اساس نیازهای فعلی شما نمایش داده شدند."
        warning_code = None
        try:
            if data.get("message"):
                result = QuerySetModificationService(GapGptProvider()).process_user_query(
                    data["message"], current_query_set=base_query_set
                )
                query_set = result.query_set
                candidates = result.candidates
                message = result.message
                if result.message_fallback:
                    fallback_warning = "پیام گفتگو معتبر نبود و از پیام پیش‌فرض استفاده شد."
                    warning_code = "llm_message_invalid"
            else:
                query_set = normalize_query_set(data["query_set"])
                candidates = filter_catalog(query_set_to_filter_requirements(query_set))
        except (QuerySetValidationError, UnsupportedQuerySetFieldError, ValueError) as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except LLMProviderError:
            logger.exception("LLM provider call failed")
            # LLM interpretation is optional. The supplied QuerySet remains a
            # deterministic source of filters; otherwise use the empty one.
            query_set = normalize_query_set(base_query_set or empty_query_set())
            candidates = filter_catalog(query_set_to_filter_requirements(query_set))
            message = "تفسیر پیام جدید موقتاً در دسترس نبود و نتایج بر اساس نیازهای قبلی نمایش داده شدند."
            fallback_warning = message
            warning_code = "llm_interpretation_unavailable"

        candidates = self._ordered(candidates, data["ordering"])
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(candidates, request, view=self)
        response = paginator.get_paginated_response(
            SearchResultSerializer(page, many=True, context={"request": request}).data
        )
        response.data["query_set"] = query_set
        response.data["queryset"] = query_set
        response.data["message"] = message
        response.data["ordering"] = data["ordering"]
        if request.user.is_authenticated:
            save_query_set(request.user, query_set)
        if fallback_warning:
            response.data["warning"] = fallback_warning
            response.data["warning_code"] = warning_code
        return response

    @staticmethod
    def _ordered(queryset, ordering):
        if ordering in {"price_asc", "price_desc"}:
            queryset = queryset.annotate(
                minimum_available_price=Min(
                    "offers__price",
                    filter=Q(
                        offers__quantity__gt=0,
                        offers__store__status=Store.Status.ACTIVE,
                    ),
                )
            )
            if ordering == "price_asc":
                return queryset.order_by(F("minimum_available_price").asc(nulls_last=True), "pk")
            return queryset.order_by(F("minimum_available_price").desc(nulls_last=True), "pk")
        if ordering in {"battery_high", "battery_low"}:
            field = "device_model__battery_spec__capacity_mah"
            expression = F(field).desc(nulls_last=True) if ordering == "battery_high" else F(field).asc(nulls_last=True)
            return queryset.order_by(expression, "pk")
        field = "-device_model__released_on" if ordering == "newest" else "device_model__released_on"
        return queryset.order_by(F(field.lstrip("-")).desc(nulls_last=True) if field.startswith("-") else F(field).asc(nulls_last=True), "pk")


class QuerySetResetView(APIView):
    """Reset the authenticated user's saved search preferences to all null."""

    permission_classes = [IsTorobcheUser]

    @extend_schema(request=None, responses=TorobcheResetResponseSerializer)
    def post(self, request):
        query_set = reset_query_set(request.user)
        return Response({
            "message": "نیازهای قبلی را پاک کردم تا از ابتدا شروع کنیم.",
            "query_set": query_set,
            "queryset": query_set,
        })


class QuerySetStateView(APIView):
    """Return only the requesting user's durable Torobche state."""

    permission_classes = [IsTorobcheUser]

    @extend_schema(responses=TorobcheStateResponseSerializer)
    def get(self, request):
        query_set, updated_at = get_saved_query_set_state(request.user)
        if query_set is None:
            query_set = reset_query_set(request.user)
            query_set, updated_at = get_saved_query_set_state(request.user)
        return Response({
            "queryset": query_set,
            "query_set": query_set,
            "has_active_filters": has_active_filters(query_set),
            "updated_at": updated_at,
        })


class PhoneExplanationAPIView(APIView):
    """Return a transient, user-filtered Persian explanation for one variant."""

    permission_classes = [IsTorobcheUser]
    no_filter_description = "برای ارائه پیشنهاد شخصی‌سازی شده ابتدا جستجوی خود را انجام دهید."

    @extend_schema(responses=ExplanationResponseSerializer)
    def get(self, request, pk):
        try:
            variant = DeviceVariant.objects.select_related(
                "device_model__brand",
                "device_model__performance_spec",
                "device_model__battery_spec",
            ).prefetch_related(
                "device_model__display_specs",
                "device_model__camera_systems__lenses",
            ).get(pk=pk, device_model__is_catalog_eligible=True, is_available=True)
        except DeviceVariant.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        user_filter = get_saved_query_set(request.user)
        if user_filter is None or not has_active_filters(user_filter):
            return Response({
                "code": "torobche_context_required",
                "detail": "برای دریافت توضیح شخصی‌سازی‌شده ابتدا نیازهای خود را با تربچه مشخص کنید.",
            }, status=status.HTTP_409_CONFLICT)

        product = AIProductExplanationSerializer(variant).data
        try:
            description = ExplanationService().explain(user_filter, product)
        except LLMProviderError:
            return Response({
                "phone_id": variant.pk,
                "description": None,
                "error": "AI explanation temporarily unavailable",
            })
        return Response({"phone_id": variant.pk, "description": description})

class DeviceVariantDetailView(generics.RetrieveAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = DeviceVariantDetailSerializer
    queryset = DeviceVariant.objects.select_related(
        "device_model__brand",
        "device_model__performance_spec",
        "device_model__battery_spec",
        "device_model__connectivity_spec",
        "device_model__physical_spec",
        "device_model__software_spec",
    ).prefetch_related(
        "device_model__display_specs",
        "device_model__camera_systems__lenses",
        "device_model__benchmark_measurements",
    ).filter(device_model__is_catalog_eligible=True, is_available=True)
