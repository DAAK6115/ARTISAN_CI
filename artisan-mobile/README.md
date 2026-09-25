# ARTISAN_CI Mobile — V3

Application mobile/PWA React + TypeScript consommant l'API Django REST existante d'ARTISAN_CI.

## Sprint V3

Cette version ajoute le premier parcours client complet :

- recherche et filtrage des prestations ;
- détail d'une prestation ;
- profil public d'un artisan, portfolio et avis ;
- lecture des disponibilités réelles ;
- création d'un rendez-vous ;
- suivi et annulation autorisée des rendez-vous ;
- liste des conversations et messagerie texte ;
- consultation et modification du profil client ;
- intégration du logo officiel ARTISAN_CI sans modification dans l'interface et la PWA.

## Logo officiel

Le fichier fourni par le propriétaire du projet est conservé tel quel dans :

`public/branding/logo-artisan-ci.png`

Il est utilisé dans :

- splash screen ;
- écran de connexion ;
- en-têtes de l'application ;
- favicon ;
- Apple Touch Icon ;
- manifest PWA.

## Développement local

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

Par défaut, `.env.example` attend l'API Django locale.

Pour tester depuis un téléphone sur le même réseau Wi-Fi, remplacez `localhost` dans `.env` par l'adresse IPv4 du PC, puis lancez Django avec :

```powershell
python manage.py runserver 0.0.0.0:8000
```

Vite est déjà configuré avec `host: true`.

## Authentification

Le frontend mobile utilise les endpoints navigateur sécurisés :

- `POST /api/accounts/session/login/`
- `POST /api/accounts/session/refresh/`
- `POST /api/accounts/session/logout/`

Le refresh token est conservé dans un cookie HttpOnly géré par Django. L'access token reste en mémoire dans l'application et n'est pas persisté dans `localStorage`.

## Backend utilisé par le parcours client

- `GET /api/services/`
- `GET /api/services/<id>/`
- `GET /api/portfolio/artisans/<username>/`
- `GET /api/reviews/service/<id>/`
- `GET /api/reviews/artisan/<username>/`
- `GET /api/appointments/creneaux/<service_id>/?date=AAAA-MM-JJ`
- `POST /api/appointments/create/`
- `GET /api/appointments/mes/`
- `PATCH /api/appointments/<id>/changer-statut/`
- `GET /api/chat/messages/contacts/`
- `GET /api/chat/messages/<contact_id>/`
- `POST /api/chat/messages/send/`
- `GET /api/accounts/profile/me/`
- `PUT /api/accounts/profile/update/`

## Production

Ne jamais utiliser `AUTH_REFRESH_COOKIE_SECURE=false` en production. Le déploiement final doit fonctionner exclusivement en HTTPS avec les origines CORS et CSRF explicitement autorisées.
