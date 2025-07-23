from rest_framework import serializers
from .models import CustomUser

# ✅ Sérialiseur d'inscription
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    role = serializers.ChoiceField(choices=CustomUser.ROLE_CHOICES)

    class Meta:
        model = CustomUser
        fields = ['id', 'email', 'username', 'password', 'role']

    def validate_email(self, value):
        if CustomUser.objects.filter(email=value).exists():
            raise serializers.ValidationError("Cet email est déjà utilisé.")
        return value

    def validate_username(self, value):
        if CustomUser.objects.filter(username=value).exists():
            raise serializers.ValidationError("Ce nom d'utilisateur est déjà utilisé.")
        return value

    def create(self, validated_data):
        return CustomUser.objects.create_user(**validated_data)


# ✅ Sérialiseur d'affichage d'utilisateur
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['id', 'email', 'username', 'role', 'is_active']


# ✅ Sérialiseur de mise à jour du profil
class UpdateProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['username', 'numero_momo', 'qr_wave']

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = [
            'username', 'email', 'role',
            'numero_momo', 'qr_wave',
            'is_active'
        ]
        read_only_fields = ['email', 'username', 'role', 'is_active']
