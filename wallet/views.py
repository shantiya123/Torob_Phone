"""Customer wallet API endpoints."""

from drf_spectacular.utils import OpenApiParameter, OpenApiTypes, extend_schema
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from api_pagination import StandardResultsSetPagination
from api_permissions import IsCustomer

from .models import Wallet, WalletTransaction
from .serializers import (
    WalletChargeResponseSerializer,
    WalletChargeSerializer,
    WalletSerializer,
    WalletTransactionSerializer,
)
from .services import charge_wallet


class MyWalletView(generics.RetrieveAPIView):
    permission_classes = [IsCustomer]
    serializer_class = WalletSerializer

    def get_object(self):
        wallet, _ = Wallet.objects.get_or_create(user=self.request.user)
        return wallet


class MyWalletTransactionListView(generics.ListAPIView):
    permission_classes = [IsCustomer]
    serializer_class = WalletTransactionSerializer
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        wallet, _ = Wallet.objects.get_or_create(user=self.request.user)
        return WalletTransaction.objects.filter(wallet=wallet).order_by("-created_at", "-pk")


class WalletChargeView(APIView):
    permission_classes = [IsCustomer]

    @extend_schema(
        request=WalletChargeSerializer,
        responses={200: WalletChargeResponseSerializer},
        parameters=[
            OpenApiParameter(
                "Idempotency-Key",
                OpenApiTypes.STR,
                OpenApiParameter.HEADER,
                required=True,
                description="Unique key scoped to this Customer wallet charge.",
            )
        ],
        description="Demo wallet top-up using integer project monetary units.",
    )
    def post(self, request):
        key = request.headers.get("Idempotency-Key", "").strip()
        if not key or len(key) > 128:
            return Response(
                {"code": "idempotency_key_required", "detail": "A valid Idempotency-Key is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = WalletChargeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            payload, replayed = charge_wallet(
                request.user, serializer.validated_data["amount"], key
            )
        except ValueError as exc:
            return Response(
                {"code": "wallet_charge_in_progress", "detail": str(exc)},
                status=status.HTTP_409_CONFLICT,
            )
        response = Response(payload, status=status.HTTP_200_OK if replayed else status.HTTP_201_CREATED)
        if replayed:
            response["Idempotent-Replay"] = "true"
        return response
