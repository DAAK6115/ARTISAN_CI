from django.urls import path
from .views import ListeArticlesView, AjouterArticleView

urlpatterns = [
    path('', ListeArticlesView.as_view(), name='liste-articles'),
    path('ajouter/', AjouterArticleView.as_view(), name='ajouter-article'),
]