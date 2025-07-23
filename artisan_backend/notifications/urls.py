from django.urls import path
from .views import CreerNotificationAvisView, MesNotificationsView, MarquerCommeLuView

urlpatterns = [
    path('', MesNotificationsView.as_view(), name='mes-notifications'),
    path('<int:pk>/lu/', MarquerCommeLuView.as_view(), name='marquer-comme-lu'),
    path('creer/', CreerNotificationAvisView.as_view(), name='creer-notification'),
]
