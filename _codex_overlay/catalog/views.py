import importlib.util
import logging
import sys
from pathlib import Path

from drf_spectacular.utils import extend_schema

logger = logging.getLogger(__name__)

_original_path = Path(__file__).resolve().parents[2] / "catalog" / "views.py"
_spec = importlib.util.spec_from_file_location("catalog.views_original", _original_path)
_original = importlib.util.module_from_spec(_spec)
sys.modules[_spec.name] = _original
assert _spec.loader is not None
_spec.loader.exec_module(_original)

DeviceVariantDetailView = _original.DeviceVariantDetailView
PhoneExplanationAPIView = _original.PhoneExplanationAPIView
QuerySetResetView = _original.QuerySetResetView
QuerySetStateView = _original.QuerySetStateView
StoreCatalogPhoneDetailView = _original.StoreCatalogPhoneDetailView
StoreCatalogPhoneListView = _original.StoreCatalogPhoneListView


class SearchView(_original.SearchView):
    @extend_schema(request=_original.SearchRequestSerializer, responses=_original.TorobcheSearchResponseSerializer)
    def post(self, request):
        logger.info(
            "search_request_received",
            extra={
                "user_id": getattr(request.user, "pk", None),
                "has_message": bool(request.data.get("message")),
                "has_query_set": request.data.get("query_set") is not None,
            },
        )
        response = super().post(request)
        if hasattr(response, "data") and isinstance(response.data, dict) and "search_mode" in response.data:
            search_mode = response.data.pop("search_mode")
            recovery = response.data.pop("recovery", None)
            if search_mode == "recovery_required":
                response.data.setdefault("warning", "پیشنهادهای نرم برای این جست‌وجو آماده‌اند.")
                response.data.setdefault("warning_code", "recovery_required")
            elif search_mode == "no_safe_recovery":
                response.data.setdefault("warning", "پیشنهاد امنی برای این جست‌وجو پیدا نشد.")
                response.data.setdefault("warning_code", "no_safe_recovery")
            logger.info(
                "search_recovery_response_stripped",
                extra={
                    "user_id": getattr(request.user, "pk", None),
                    "search_mode": search_mode,
                    "had_recovery_payload": recovery is not None,
                },
            )
        return response