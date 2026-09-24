from django.urls import path
from .views import (
    ContactListView,
    ConversationAccessView,
    DeleteMessageView,
    MarkConversationReadView,
    MarkMessageAsReadView,
    MessageListView,
    SendMessageView,
    ToggleBlockView,
    UpdateMessageView,
    WebSocketTicketView,
)

urlpatterns = [
    path("ws-ticket/", WebSocketTicketView.as_view(), name="ws-ticket"),
    path("messages/contacts/", ContactListView.as_view(), name="contact-list"),
    path("messages/send/", SendMessageView.as_view(), name="send-message"),
    path("messages/<int:contact_id>/", MessageListView.as_view(), name="message-list"),
    path("messages/<int:contact_id>/read/", MarkConversationReadView.as_view(), name="conversation-read"),
    path("messages/<int:pk>/mark-as-read/", MarkMessageAsReadView.as_view(), name="message-read"),
    path("messages/<int:pk>/update/", UpdateMessageView.as_view(), name="message-update"),
    path("messages/<int:pk>/delete/", DeleteMessageView.as_view(), name="message-delete"),
    path("blocks/<int:user_id>/toggle/", ToggleBlockView.as_view(), name="chat-block-toggle"),
    path("access/<int:user_id>/", ConversationAccessView.as_view(), name="chat-access"),
]
