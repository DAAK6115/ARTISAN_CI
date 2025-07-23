from django.urls import path
from .views import (
    MessageListView,
    SendMessageView,
    MarkMessageAsReadView,
    UpdateMessageView,
    DeleteMessageView,
    ContactListView
)

urlpatterns = [
    path('messages/<int:contact_id>/', MessageListView.as_view(), name='message-list'),
    path('messages/send/', SendMessageView.as_view(), name='send-message'),
    path('messages/<int:pk>/mark-as-read/', MarkMessageAsReadView.as_view(), name='mark-message-as-read'),
    path('messages/<int:pk>/update/', UpdateMessageView.as_view(), name='update-message'),
    path('messages/<int:pk>/delete/', DeleteMessageView.as_view(), name='delete-message'),
    path('messages/contacts/', ContactListView.as_view(), name='contact-list'),
]
