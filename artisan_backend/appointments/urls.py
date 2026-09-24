from django.urls import path

from .views import (
    AppointmentDetailView,
    ArtisanAppointmentsView,
    ArtisanAvailabilityDetailView,
    ArtisanAvailabilityListCreateView,
    ArtisanTimeOffDetailView,
    ArtisanTimeOffListCreateView,
    AvailableSlotsView,
    ConfirmerAppointmentView,
    CreateAppointmentView,
    MyAppointmentsView,
    UpdateAppointmentStatusView,
)

urlpatterns = [
    path('create/', CreateAppointmentView.as_view(), name='create-appointment'),
    path('mes/', MyAppointmentsView.as_view(), name='my-appointments'),
    path(
        'mes-rendezvous-artisan/',
        ArtisanAppointmentsView.as_view(),
        name='artisan-appointments',
    ),
    path(
        'creneaux/<int:service_id>/',
        AvailableSlotsView.as_view(),
        name='available-slots',
    ),
    path(
        'disponibilites/',
        ArtisanAvailabilityListCreateView.as_view(),
        name='artisan-availability-list-create',
    ),
    path(
        'disponibilites/<int:pk>/',
        ArtisanAvailabilityDetailView.as_view(),
        name='artisan-availability-detail',
    ),
    path(
        'indisponibilites/',
        ArtisanTimeOffListCreateView.as_view(),
        name='artisan-timeoff-list-create',
    ),
    path(
        'indisponibilites/<int:pk>/',
        ArtisanTimeOffDetailView.as_view(),
        name='artisan-timeoff-detail',
    ),
    path(
        '<int:pk>/changer-statut/',
        UpdateAppointmentStatusView.as_view(),
        name='update-appointment-status',
    ),
    path(
        'confirmer/<int:pk>/',
        ConfirmerAppointmentView.as_view(),
        name='confirm-appointment',
    ),
    path('<int:pk>/', AppointmentDetailView.as_view(), name='appointment-detail'),
]
