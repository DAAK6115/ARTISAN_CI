from rest_framework import serializers

from .models import Message


class MessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source="sender.username", read_only=True)
    receiver_username = serializers.CharField(source="receiver.username", read_only=True)
    media_url = serializers.SerializerMethodField()
    audio_url = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    reply_preview = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            "id", "sender", "receiver", "content", "timestamp", "is_read",
            "sender_username", "receiver_username", "media_url", "audio_url",
            "delivered_at", "read_at", "edited_at", "deleted_at", "status",
            "reply_to", "reply_preview", "location_lat", "location_lng",
        ]
        read_only_fields = [
            "timestamp", "is_read", "sender", "delivered_at", "read_at",
            "edited_at", "deleted_at", "status", "reply_preview",
        ]

    def _absolute_url(self, file_field):
        request = self.context.get("request")
        if not file_field:
            return None
        if request:
            return request.build_absolute_uri(file_field.url)
        return file_field.url

    def get_media_url(self, obj):
        if obj.deleted_at:
            return None
        return self._absolute_url(obj.media)

    def get_audio_url(self, obj):
        if obj.deleted_at:
            return None
        return self._absolute_url(obj.audio)

    def get_status(self, obj):
        if obj.read_at or obj.is_read:
            return "lu"
        if obj.delivered_at:
            return "recu"
        return "envoye"

    def get_reply_preview(self, obj):
        reply = obj.reply_to
        if not reply:
            return None
        return {
            "id": reply.id,
            "sender_username": reply.sender.username,
            "content": "Message supprimé" if reply.deleted_at else (reply.content or "Pièce jointe")[:180],
        }

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.deleted_at:
            data["content"] = ""
            data["location_lat"] = None
            data["location_lng"] = None
        return data
