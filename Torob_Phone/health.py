from django.db import connection
from django.db.utils import OperationalError
from django.http import JsonResponse


def health_check(request):
    """Plain (non-DRF) view: no auth required, checks DB connectivity."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
    except OperationalError as exc:
        return JsonResponse({"status": "error", "detail": str(exc)}, status=503)
    return JsonResponse({"status": "ok"})