from django.urls import path

from .views import (
    AcceptQuoteView,
    ArtisanPaymentWorkspaceView,
    ArtisanPaymentsView,
    ArtisanQuoteListCreateView,
    ClientPaymentsView,
    ClientQuoteListView,
    CompleteServiceWithPaymentView,
    DeclarePaymentView,
    PaymentReceiptPDFView,
    QuoteDetailView,
    RejectQuoteView,
    SendQuoteView,
)

urlpatterns = [
    # Paiements : lecture client, déclaration exclusivement artisan.
    path('mes/', ClientPaymentsView.as_view(), name='client-payments'),
    path('recus-artisan/', ArtisanPaymentsView.as_view(), name='artisan-payments'),
    path('reçus-artisan/', ArtisanPaymentsView.as_view(), name='artisan-payments-legacy'),
    path('artisan-workspace/', ArtisanPaymentWorkspaceView.as_view(), name='artisan-payment-workspace'),
    path('declare/', DeclarePaymentView.as_view(), name='payment-declare'),
    path(
        'complete-service/<int:appointment_id>/',
        CompleteServiceWithPaymentView.as_view(),
        name='complete-service-with-payment',
    ),
    path('<int:pk>/receipt/', PaymentReceiptPDFView.as_view(), name='payment-receipt'),

    # Devis.
    path('quotes/artisan/', ArtisanQuoteListCreateView.as_view(), name='artisan-quotes'),
    path('quotes/client/', ClientQuoteListView.as_view(), name='client-quotes'),
    path('quotes/<int:pk>/', QuoteDetailView.as_view(), name='quote-detail'),
    path('quotes/<int:pk>/send/', SendQuoteView.as_view(), name='quote-send'),
    path('quotes/<int:pk>/accept/', AcceptQuoteView.as_view(), name='quote-accept'),
    path('quotes/<int:pk>/reject/', RejectQuoteView.as_view(), name='quote-reject'),
]
