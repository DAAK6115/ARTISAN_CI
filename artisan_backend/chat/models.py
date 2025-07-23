from django.db import models
from django.utils import timezone
from accounts.models import CustomUser

class Message(models.Model):
    sender = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='sent_messages')
    receiver = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='received_messages')
    content = models.TextField()
    timestamp = models.DateTimeField(default=timezone.now)
    is_read = models.BooleanField(default=False)
    
    media = models.FileField(upload_to='chat/media/', null=True, blank=True)
    audio = models.FileField(upload_to='chat/audio/', null=True, blank=True)

    def __str__(self):
        return f"De {self.sender.username} à {self.receiver.username} : {self.content[:30]}"
