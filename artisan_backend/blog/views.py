from rest_framework import generics, permissions

from accounts.permissions import IsAdmin
from .models import Article
from .serializers import ArticleSerializer


class ListeArticlesView(generics.ListAPIView):
    queryset = Article.objects.all().order_by("-date_publication")
    serializer_class = ArticleSerializer
    permission_classes = [permissions.AllowAny]


class AjouterArticleView(generics.CreateAPIView):
    serializer_class = ArticleSerializer
    permission_classes = [IsAdmin]

    def perform_create(self, serializer):
        serializer.save(auteur=self.request.user)
