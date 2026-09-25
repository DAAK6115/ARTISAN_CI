from pathlib import Path

settings_path = Path(__file__).resolve().parent / 'artisan_backend' / 'settings.py'
text = settings_path.read_text(encoding='utf-8')

if '"daphne"' not in text and "'daphne'" not in text:
    text = text.replace('INSTALLED_APPS = [\n', 'INSTALLED_APPS = [\n    "daphne",\n', 1)

if '"geniuspay"' not in text and "'geniuspay'" not in text:
    anchor = '    "corsheaders",\n'
    if anchor in text:
        text = text.replace(anchor, anchor + '    "geniuspay",\n', 1)
    else:
        text = text.replace('INSTALLED_APPS = [\n', 'INSTALLED_APPS = [\n    "geniuspay",\n', 1)

marker = '# --- GeniusPay ARTISAN_CI ---'
if marker not in text:
    text += '''\n\n# --- GeniusPay ARTISAN_CI ---\nGENIUSPAY = {\n    "API_KEY": os.getenv("GENIUSPAY_API_KEY", "").strip(),\n    "API_SECRET": os.getenv("GENIUSPAY_API_SECRET", "").strip(),\n    "WEBHOOK_SECRET": os.getenv("GENIUSPAY_WEBHOOK_SECRET", "").strip() or None,\n    "SANDBOX": env_bool("GENIUSPAY_SANDBOX", True),\n    "TIMEOUT": int(os.getenv("GENIUSPAY_TIMEOUT", "30")),\n}\n\nARTISAN_MOBILE_URL = os.getenv(\n    "ARTISAN_MOBILE_URL",\n    "http://localhost:5173",\n).rstrip("/")\n'''

settings_path.write_text(text, encoding='utf-8')
print(f'Configuration GeniusPay ajoutée dans {settings_path}')
