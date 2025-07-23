from django.urls import path
from .views import (
    AppointmentDetailView,
    CreateAppointmentView,
    MyAppointmentsView,
    ArtisanAppointmentsView,
    UpdateAppointmentStatusView,
    ConfirmerAppointmentView
)

urlpatterns = [
    path('create/', CreateAppointmentView.as_view(), name='create-appointment'),
    path('mes/', MyAppointmentsView.as_view(), name='my-appointments'),
    path('mes-rendezvous-artisan/', ArtisanAppointmentsView.as_view(), name='artisan-appointments'),
    path('<int:pk>/changer-statut/', UpdateAppointmentStatusView.as_view(), name='update-appointment-status'),
    path('confirmer/<int:pk>/', ConfirmerAppointmentView.as_view(), name='confirm-appointment'),  # ✅ nouvelle route
    path("<int:pk>/", AppointmentDetailView.as_view(), name="appointment-detail")
]
