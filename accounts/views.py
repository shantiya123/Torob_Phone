from django.conf import settings
from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenRefreshSerializer
from rest_framework_simplejwt.settings import api_settings as jwt_api_settings
from rest_framework_simplejwt.tokens import RefreshToken, TokenError
from rest_framework_simplejwt.views import TokenObtainPairView
from drf_spectacular.utils import OpenApiExample, extend_schema

from .serializers import (
    CustomerRegistrationSerializer,
    CurrentUserSerializer,
    AccessTokenResponseSerializer,
    StoreRegistrationSerializer,
    LogoutResponseSerializer,
    RefreshCookieErrorSerializer,
)


def _cookie_kwargs():
    return {
        "max_age": int(jwt_api_settings.REFRESH_TOKEN_LIFETIME.total_seconds()),
        "httponly": True,
        "secure": settings.JWT_REFRESH_COOKIE_SECURE,
        "samesite": settings.JWT_REFRESH_COOKIE_SAMESITE,
        "path": settings.JWT_REFRESH_COOKIE_PATH,
        "domain": settings.JWT_REFRESH_COOKIE_DOMAIN,
    }


def _clear_refresh_cookie(response):
    response.delete_cookie(
        settings.JWT_REFRESH_COOKIE_NAME,
        path=settings.JWT_REFRESH_COOKIE_PATH,
        domain=settings.JWT_REFRESH_COOKIE_DOMAIN,
        samesite=settings.JWT_REFRESH_COOKIE_SAMESITE,
    )


def _origin_is_trusted(request):
    origin = request.headers.get("Origin")
    if not origin:
        referer = request.headers.get("Referer")
        origin = referer and referer.split("/", 3)[:3]
        origin = "/".join(origin) if origin else None
    if not origin:
        return True
    request_origin = f"{'https' if request.is_secure() else 'http'}://{request.get_host()}"
    return origin == request_origin or origin in settings.JWT_AUTH_TRUSTED_ORIGINS


class RefreshCookieOriginMixin:
    def reject_untrusted_origin(self, request):
        if _origin_is_trusted(request):
            return None
        return Response(
            {"code": "csrf_origin_invalid", "detail": "Request origin is not trusted."},
            status=status.HTTP_403_FORBIDDEN,
        )


class CookieTokenObtainPairView(TokenObtainPairView):
    """Return only an access token while storing refresh state in a HttpOnly cookie."""

    @extend_schema(
        request=TokenObtainPairSerializer,
        responses={200: AccessTokenResponseSerializer},
        description="Returns an access token and sets the refresh token only in an HttpOnly cookie.",
    )
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        refresh = response.data.pop("refresh", None)
        if refresh is None:
            return response
        response.data = {"access": response.data["access"]}
        response.set_cookie(settings.JWT_REFRESH_COOKIE_NAME, refresh, **_cookie_kwargs())
        return response


class CookieTokenRefreshView(RefreshCookieOriginMixin, APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        request=None,
        responses={200: AccessTokenResponseSerializer, 400: RefreshCookieErrorSerializer, 403: RefreshCookieErrorSerializer},
        description="Reads and rotates the HttpOnly refresh cookie. The request body must not contain a token.",
    )
    def post(self, request):
        origin_error = self.reject_untrusted_origin(request)
        if origin_error:
            return origin_error
        refresh = request.COOKIES.get(settings.JWT_REFRESH_COOKIE_NAME)
        if not refresh:
            return Response(
                {"code": "refresh_cookie_missing", "detail": "Refresh token cookie is missing."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = TokenRefreshSerializer(data={"refresh": refresh})
        try:
            serializer.is_valid(raise_exception=True)
        except (TokenError, ValidationError):
            return Response(
                {"code": "refresh_token_invalid", "detail": "Refresh token is invalid or expired."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        data = serializer.validated_data
        response = Response({"access": data["access"]})
        rotated_refresh = data.get("refresh")
        if rotated_refresh:
            response.set_cookie(settings.JWT_REFRESH_COOKIE_NAME, rotated_refresh, **_cookie_kwargs())
        return response


class LogoutView(RefreshCookieOriginMixin, APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        request=None,
        responses={200: LogoutResponseSerializer, 403: RefreshCookieErrorSerializer},
        description="Blacklists a valid HttpOnly refresh cookie when possible and always clears the cookie.",
    )
    def post(self, request):
        origin_error = self.reject_untrusted_origin(request)
        if origin_error:
            return origin_error
        refresh = request.COOKIES.get(settings.JWT_REFRESH_COOKIE_NAME)
        if refresh:
            try:
                RefreshToken(refresh).blacklist()
            except TokenError:
                pass
        response = Response({"detail": "Logged out successfully."})
        _clear_refresh_cookie(response)
        return response


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        account_type = str(request.data.get("account_type", "")).casefold()
        serializer_class = {
            "customer": CustomerRegistrationSerializer,
            "store": StoreRegistrationSerializer,
        }.get(account_type)
        if serializer_class is None:
            return Response(
                {"account_type": ["Choose either 'customer' or 'store'."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        data = request.data.copy()
        data.pop("account_type", None)
        serializer = serializer_class(data=data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class CurrentUserView(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CurrentUserSerializer
    http_method_names = ["get", "patch", "head", "options"]

    def get_object(self):
        return self.request.user
