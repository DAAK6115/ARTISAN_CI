from django.contrib import admin
from .models import AuditLog, Dispute, DisputeMessage, Report

admin.site.register(Report)
admin.site.register(Dispute)
admin.site.register(DisputeMessage)
admin.site.register(AuditLog)
