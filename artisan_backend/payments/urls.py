from django.urls import path
from .views import (
    CreatePaymentView,
    ClientPaymentsView,
    ArtisanPaymentsView,
    PaymentReceiptPDFView
)

urlpatterns = [
    path('create/', CreatePaymentView.as_view(), name='create-payment'),
    path('mes/', ClientPaymentsView.as_view(), name='client-payments'),
    path('reçus-artisan/', ArtisanPaymentsView.as_view(), name='artisan-payments'),
    path('<int:pk>/receipt/', PaymentReceiptPDFView.as_view(), name='payment-receipt'),
]

