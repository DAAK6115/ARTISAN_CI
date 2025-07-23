"""
URL configuration for artisan_backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/accounts/', include('accounts.urls')),
    path('api/services/', include('services.urls')),
    path('api/appointments/', include('appointments.urls')),
    path('api/reviews/', include('reviews.urls')),
    path('api/payments/', include('payments.urls')),
    path('api/portfolio/', include('portfolio.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('api/blog/', include('blog.urls')),
    path('api/support/', include('support.urls')),
    path('api/certifications/', include('certifications.urls')),
    path('api/favoris/', include('favoris.urls')),
    path('api/likes/', include('likes.urls')),
    path('api/chat/', include('chat.urls')),
]
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)