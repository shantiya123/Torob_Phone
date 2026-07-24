from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import (
    CustomerRegistrationSerializer,
    CurrentUserSerializer,
    StoreRegistrationSerializer,
)


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
