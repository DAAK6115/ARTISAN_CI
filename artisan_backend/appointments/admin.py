from django.contrib import admin

from .models import (
    Appointment,
    AppointmentStatusHistory,
    ArtisanAvailability,
    ArtisanTimeOff,
)


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'service',
        'client',
        'date_rdv',
        'date_fin',
        'statut',
    )
    list_filter = ('statut', 'date_rdv')
    search_fields = ('client__username', 'client__email', 'service__titre')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(ArtisanAvailability)
class ArtisanAvailabilityAdmin(admin.ModelAdmin):
    list_display = ('artisan', 'jour_semaine', 'heure_debut', 'heure_fin', 'actif')
    list_filter = ('jour_semaine', 'actif')
    search_fields = ('artisan__username', 'artisan__email')


@admin.register(ArtisanTimeOff)
class ArtisanTimeOffAdmin(admin.ModelAdmin):
    list_display = ('artisan', 'debut', 'fin', 'motif')
    search_fields = ('artisan__username', 'artisan__email', 'motif')


@admin.register(AppointmentStatusHistory)
class AppointmentStatusHistoryAdmin(admin.ModelAdmin):
    list_display = (
        'appointment',
        'ancien_statut',
        'nouveau_statut',
        'changed_by',
        'created_at',
    )
    list_filter = ('ancien_statut', 'nouveau_statut', 'created_at')
    readonly_fields = (
        'appointment',
        'ancien_statut',
        'nouveau_statut',
        'changed_by',
        'note',
        'created_at',
    )
