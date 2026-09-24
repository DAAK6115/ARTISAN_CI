from rest_framework import serializers

from common.validators import validate_image_upload
from .models import Article


class ArticleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Article
        fields = "__all__"
        read_only_fields = ["auteur", "date_publication"]

    def validate_image(self, value):
        if value is None:
            return value
        return validate_image_upload(value, max_mb=5)
