from django.urls import path
from .views import (
    AddCertificationView,
    MyCertificationsView,
    PublicCertificationsView,
    UpdateCertificationView,
    DeleteCertificationView
)

urlpatterns = [
    path('ajouter/', AddCertificationView.as_view(), name='ajouter-certification'),
    path('mes/', MyCertificationsView.as_view(), name='mes-certifications'),
    path('artisan/<str:username>/', PublicCertificationsView.as_view(), name='certifications-artisan'),
    path('<int:pk>/modifier/', UpdateCertificationView.as_view(), name='modifier-certification'),
    path('<int:pk>/supprimer/', DeleteCertificationView.as_view(), name='supprimer-certification'),
]
