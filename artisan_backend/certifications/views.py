from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied
from .models import Certification
from .serializers import CertificationSerializer

class AddCertificationView(generics.CreateAPIView):
    serializer_class = CertificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(artisan=self.request.user)

class MyCertificationsView(generics.ListAPIView):
    serializer_class = CertificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Certification.objects.filter(artisan=self.request.user)

class PublicCertificationsView(generics.ListAPIView):
    serializer_class = CertificationSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        username = self.kwargs.get('username')
        return Certification.objects.filter(artisan__username=username)

class UpdateCertificationView(generics.RetrieveUpdateAPIView):
    queryset = Certification.objects.all()
    serializer_class = CertificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_update(self, serializer):
        if self.request.user != serializer.instance.artisan:
            raise PermissionDenied("Vous ne pouvez modifier que vos propres certifications.")
        serializer.save()


class DeleteCertificationView(generics.DestroyAPIView):
    queryset = Certification.objects.all()
    serializer_class = CertificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        certif = super().get_object()
        if certif.artisan != self.request.user:
            raise PermissionDenied("Non autorisé.")
        return certif
