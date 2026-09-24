from django.contrib import admin

from .models import Payment, Quote, QuoteLine


class QuoteLineInline(admin.TabularInline):
    model = QuoteLine
    extra = 0


@admin.register(Quote)
class QuoteAdmin(admin.ModelAdmin):
    list_display = ('reference', 'appointment', 'artisan', 'client', 'total', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('reference', 'artisan__username', 'client__username')
    inlines = [QuoteLineInline]


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        'transaction_id',
        'client',
        'service',
        'montant',
        'statut',
        'methode_paiement',
        'declared_by',
        'declared_at',
    )
    list_filter = ('statut', 'methode_paiement', 'declared_at')
    search_fields = (
        'transaction_id',
        'client__username',
        'client__email',
        'service__titre',
    )
    readonly_fields = (
        'transaction_id',
        'declared_at',
        'paid_at',
        'date_paiement',
        'updated_at',
    )
