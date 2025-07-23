from rest_framework import serializers
from .models import Message

class MessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source='sender.username', read_only=True)
    receiver_username = serializers.CharField(source='receiver.username', read_only=True)
    media_url = serializers.SerializerMethodField()
    audio_url = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            'id', 'sender', 'receiver', 'content', 'timestamp', 'is_read',
            'sender_username', 'receiver_username', 'media_url', 'audio_url'
        ]
        read_only_fields = ['timestamp', 'is_read', 'sender']

    def get_media_url(self, obj):
        request = self.context.get('request')
        if obj.media and request:
            return request.build_absolute_uri(obj.media.url)
        return None
    

    def get_audio_url(self, obj):
        request = self.context.get('request')
        if obj.audio and request:
            return request.build_absolute_uri(obj.audio.url)
        return None

