from django.urls import path
from geniuspay import geniuspay_webhook_view

from .views import (
    AcceptQuoteView,
    ArtisanPaymentWorkspaceView,
    ArtisanPaymentsView,
    ArtisanQuoteListCreateView,
    ClientPaymentWorkspaceView,
    ClientPaymentsView,
    ClientQuoteListView,
    CompleteServiceWithPaymentView,
    DeclarePaymentView,
    InitiateGeniusPayPaymentView,
    PaymentReceiptPDFView,
    QuoteDetailView,
    RejectQuoteView,
    SendQuoteView,
    SyncGeniusPayPaymentView,
)

urlpatterns = [
    path('mes/', ClientPaymentsView.as_view(), name='client-payments'),
    path('client-workspace/', ClientPaymentWorkspaceView.as_view(), name='client-payment-workspace'),
    path('geniuspay/initiate/<int:appointment_id>/', InitiateGeniusPayPaymentView.as_view(), name='geniuspay-initiate'),
    path('geniuspay/sync/<int:pk>/', SyncGeniusPayPaymentView.as_view(), name='geniuspay-sync'),
    path('geniuspay/webhook/', geniuspay_webhook_view, name='geniuspay-webhook'),

    path('recus-artisan/', ArtisanPaymentsView.as_view(), name='artisan-payments'),
    path('reçus-artisan/', ArtisanPaymentsView.as_view(), name='artisan-payments-legacy'),
    path('artisan-workspace/', ArtisanPaymentWorkspaceView.as_view(), name='artisan-payment-workspace'),
    path('declare/', DeclarePaymentView.as_view(), name='payment-declare'),
    path('complete-service/<int:appointment_id>/', CompleteServiceWithPaymentView.as_view(), name='complete-service'),
    path('<int:pk>/receipt/', PaymentReceiptPDFView.as_view(), name='payment-receipt'),

    path('quotes/artisan/', ArtisanQuoteListCreateView.as_view(), name='artisan-quotes'),
    path('quotes/client/', ClientQuoteListView.as_view(), name='client-quotes'),
    path('quotes/<int:pk>/', QuoteDetailView.as_view(), name='quote-detail'),
    path('quotes/<int:pk>/send/', SendQuoteView.as_view(), name='quote-send'),
    path('quotes/<int:pk>/accept/', AcceptQuoteView.as_view(), name='quote-accept'),
    path('quotes/<int:pk>/reject/', RejectQuoteView.as_view(), name='quote-reject'),
]
