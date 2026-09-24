from django.contrib import admin
from .models import ChatBlock, ChatPresence, Message, WebSocketTicket

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("id", "sender", "receiver", "timestamp", "is_read", "deleted_at")
    list_filter = ("is_read", "timestamp")
    search_fields = ("sender__username", "receiver__username", "content")
    readonly_fields = ("timestamp", "delivered_at", "read_at", "edited_at", "deleted_at")

admin.site.register(ChatBlock)
admin.site.register(ChatPresence)
admin.site.register(WebSocketTicket)
