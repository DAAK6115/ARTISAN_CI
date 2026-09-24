from pathlib import Path

from django.core.exceptions import ValidationError
from PIL import Image, UnidentifiedImageError


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
IMAGE_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}

DOCUMENT_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".webp"}
DOCUMENT_MIME_TYPES = IMAGE_MIME_TYPES | {"application/pdf"}

VIDEO_EXTENSIONS = {".mp4", ".webm", ".mov"}
VIDEO_MIME_TYPES = {"video/mp4", "video/webm", "video/quicktime"}

AUDIO_EXTENSIONS = {".mp3", ".wav", ".ogg", ".m4a", ".webm"}
AUDIO_MIME_TYPES = {
    "audio/mpeg",
    "audio/wav",
    "audio/x-wav",
    "audio/ogg",
    "audio/mp4",
    "audio/webm",
}


def _size_mb(uploaded_file) -> float:
    size = getattr(uploaded_file, "size", 0) or 0
    return size / (1024 * 1024)


def _extension(uploaded_file) -> str:
    return Path(getattr(uploaded_file, "name", "") or "").suffix.lower()


def _content_type(uploaded_file) -> str:
    return (getattr(uploaded_file, "content_type", "") or "").lower().strip()


def _ensure_max_size(uploaded_file, max_mb: int):
    if _size_mb(uploaded_file) > max_mb:
        raise ValidationError(f"Le fichier ne doit pas dépasser {max_mb} Mo.")


def _verify_image_content(uploaded_file):
    original_position = None
    try:
        if hasattr(uploaded_file, "tell"):
            original_position = uploaded_file.tell()
        image = Image.open(uploaded_file)
        image.verify()
    except (UnidentifiedImageError, OSError, ValueError):
        raise ValidationError("Le fichier image est invalide ou corrompu.")
    finally:
        if hasattr(uploaded_file, "seek"):
            uploaded_file.seek(original_position or 0)


def validate_image_upload(uploaded_file, max_mb: int = 5):
    if uploaded_file is None:
        return uploaded_file

    _ensure_max_size(uploaded_file, max_mb)

    extension = _extension(uploaded_file)
    content_type = _content_type(uploaded_file)

    if extension not in IMAGE_EXTENSIONS:
        raise ValidationError("Format d'image non autorisé. Utilisez JPG, PNG ou WebP.")

    if content_type and content_type not in IMAGE_MIME_TYPES:
        raise ValidationError("Type MIME d'image non autorisé.")

    _verify_image_content(uploaded_file)
    return uploaded_file


def validate_document_upload(uploaded_file, max_mb: int = 5):
    if uploaded_file is None:
        return uploaded_file

    _ensure_max_size(uploaded_file, max_mb)

    extension = _extension(uploaded_file)
    content_type = _content_type(uploaded_file)

    if extension not in DOCUMENT_EXTENSIONS:
        raise ValidationError("Format de document non autorisé.")

    if content_type and content_type not in DOCUMENT_MIME_TYPES:
        raise ValidationError("Type MIME de document non autorisé.")

    if extension == ".pdf":
        original_position = uploaded_file.tell() if hasattr(uploaded_file, "tell") else 0
        try:
            header = uploaded_file.read(5)
            if header != b"%PDF-":
                raise ValidationError("Le fichier PDF est invalide.")
        finally:
            if hasattr(uploaded_file, "seek"):
                uploaded_file.seek(original_position)
    else:
        _verify_image_content(uploaded_file)

    return uploaded_file


def validate_chat_media(uploaded_file, max_mb: int = 20):
    if uploaded_file is None:
        return uploaded_file

    _ensure_max_size(uploaded_file, max_mb)

    extension = _extension(uploaded_file)
    content_type = _content_type(uploaded_file)

    if extension in IMAGE_EXTENSIONS:
        return validate_image_upload(uploaded_file, max_mb=min(max_mb, 8))

    if extension not in VIDEO_EXTENSIONS:
        raise ValidationError("Seules les images et vidéos autorisées peuvent être envoyées.")

    if content_type and content_type not in VIDEO_MIME_TYPES:
        raise ValidationError("Type MIME vidéo non autorisé.")

    return uploaded_file


def validate_audio_upload(uploaded_file, max_mb: int = 10):
    if uploaded_file is None:
        return uploaded_file

    _ensure_max_size(uploaded_file, max_mb)

    extension = _extension(uploaded_file)
    content_type = _content_type(uploaded_file)

    # MediaRecorder peut envoyer un Blob nommé simplement "blob".
    if extension and extension not in AUDIO_EXTENSIONS:
        raise ValidationError("Format audio non autorisé.")

    if content_type and content_type not in AUDIO_MIME_TYPES:
        raise ValidationError("Type MIME audio non autorisé.")

    if not content_type and not extension:
        raise ValidationError("Le format audio n'a pas pu être identifié.")

    return uploaded_file
