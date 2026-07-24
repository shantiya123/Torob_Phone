from django.db.models import F, Min, Q
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from api_pagination import StandardResultsSetPagination
from marketplace.models import Store

from .filtering import filter_catalog
from .ai.explanation_service import ExplanationService
from .ai.serializers import AIProductExplanationSerializer
from .llm_provider import GapGptProvider, LLMProviderError
from .models import DeviceVariant
from .query_adapter import (
    UnsupportedQuerySetFieldError,
    normalize_query_set,
    query_set_to_filter_requirements,
)
from .query_service import QuerySetModificationService
from .query_set import QuerySetValidationError
from .query_set import empty_query_set
from .query_set_storage import get_saved_query_set, has_active_filters, reset_query_set, save_query_set
from .serializers import DeviceVariantDetailSerializer, SearchRequestSerializer, SearchResultSerializer


class SearchView(APIView):
    permission_classes = [permissions.AllowAny]
    pagination_class = StandardResultsSetPagination

    def post(self, request):
        request_serializer = SearchRequestSerializer(data=request.data)
        request_serializer.is_valid(raise_exception=True)
        data = request_serializer.validated_data

        saved_query_set = (
            get_saved_query_set(request.user) if request.user.is_authenticated else None
        )
        base_query_set = data.get("query_set") or saved_query_set
        fallback_warning = None
        try:
            if data.get("message"):
                result = QuerySetModificationService(GapGptProvider()).process_user_query(
                    data["message"], current_query_set=base_query_set
                )
                query_set = result.query_set
                candidates = result.candidates
            else:
                query_set = normalize_query_set(data["query_set"])
                candidates = filter_catalog(query_set_to_filter_requirements(query_set))
        except (QuerySetValidationError, UnsupportedQuerySetFieldError, ValueError) as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except LLMProviderError:
            # LLM interpretation is optional. The supplied QuerySet remains a
            # deterministic source of filters; otherwise use the empty one.
            query_set = normalize_query_set(base_query_set or empty_query_set())
            candidates = filter_catalog(query_set_to_filter_requirements(query_set))
            fallback_warning = "Natural-language interpretation was unavailable; deterministic filters were used."

        candidates = self._ordered(candidates, data["ordering"])
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(candidates, request, view=self)
        response = paginator.get_paginated_response(
            SearchResultSerializer(page, many=True, context={"request": request}).data
        )
        response.data["query_set"] = query_set
        response.data["ordering"] = data["ordering"]
        if request.user.is_authenticated:
            save_query_set(request.user, query_set)
        if fallback_warning:
            response.data["warning"] = fallback_warning
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

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        return Response({"query_set": reset_query_set(request.user)})


class PhoneExplanationAPIView(APIView):
    """Return a transient, user-filtered Persian explanation for one variant."""

    permission_classes = [permissions.IsAuthenticated]
    no_filter_description = "برای ارائه پیشنهاد شخصی‌سازی شده ابتدا جستجوی خود را انجام دهید."

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
            return Response({"phone_id": variant.pk, "description": self.no_filter_description})

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
