# Artisan_CI

**Artisan_CI** est une plateforme numérique (web et mobile) conçue pour faciliter la mise en relation entre les **artisans ivoiriens** et leurs **clients**, tout en promouvant la digitalisation du secteur informel.

## 🌍 Objectif
Simplifier l’accès aux services artisanaux en Côte d’Ivoire grâce à une solution intuitive, sécurisée et accessible à tous.

## 🚀 Fonctionnalités
- ✅ Création de profils artisans (photos, compétences, tarifs…)
- 🔍 Recherche par service et par localisation
- 📅 Réservation de prestations en ligne
- 💬 Messagerie client-artisan
- 🌟 Notation et avis
- 💳 Paiement via Mobile Money (Orange, MTN, Moov, Wave)
- 📱 Application mobile Flutter (Android/iOS)
- 🌐 Interface web responsive (React.js)

## 🛠️ Stack technique
- **Frontend Web** : React.js  
- **Frontend Mobile** : Flutter  
- **Backend** : Django + Django REST Framework  
- **Base de données** : PostgreSQL  
- **Authentification** : JWT + Firebase  
- **Services externes** : SMS, WhatsApp, Mobile Money API

## 📦 Installation

### 1. Backend Django
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

### 2. Frontend React

bash
cd frontend
npm install
npm start
