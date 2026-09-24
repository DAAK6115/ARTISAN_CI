from django.urls import path
from .views import (
    AdminAuditLogsView, AdminDashboardView, AdminDisputeUpdateView, AdminDisputesView,
    AdminReportUpdateView, AdminReportsView, AdminUserActionView, AdminUsersView,
    CreatePaymentDisputeView, CreateReportView, DisputeMessageCreateView,
    MyDisputesView, MyReportsView,
)

urlpatterns = [
    path("reports/", CreateReportView.as_view(), name="create-report"),
    path("reports/mine/", MyReportsView.as_view(), name="my-reports"),
    path("disputes/mine/", MyDisputesView.as_view(), name="my-disputes"),
    path("disputes/payment/<int:payment_id>/", CreatePaymentDisputeView.as_view(), name="create-payment-dispute"),
    path("disputes/<int:pk>/messages/", DisputeMessageCreateView.as_view(), name="dispute-message"),
    path("admin/dashboard/", AdminDashboardView.as_view(), name="admin-dashboard"),
    path("admin/users/", AdminUsersView.as_view(), name="admin-users"),
    path("admin/users/<int:pk>/action/", AdminUserActionView.as_view(), name="admin-user-action"),
    path("admin/reports/", AdminReportsView.as_view(), name="admin-reports"),
    path("admin/reports/<int:pk>/", AdminReportUpdateView.as_view(), name="admin-report-update"),
    path("admin/disputes/", AdminDisputesView.as_view(), name="admin-disputes"),
    path("admin/disputes/<int:pk>/", AdminDisputeUpdateView.as_view(), name="admin-dispute-update"),
    path("admin/audit/", AdminAuditLogsView.as_view(), name="admin-audit"),
]
