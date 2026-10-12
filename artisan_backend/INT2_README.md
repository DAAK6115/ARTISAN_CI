# ARTISAN_CI — Sprint INT 2

Ce lot termine **INT 2 — Téléphone international + profil Client enrichi** sur la version actuelle du dépôt.

## Ce qui est ajouté

- inscription : le numéro principal est enregistré dans `phone_number` au lieu de détourner `numero_momo`;
- normalisation backend E.164 conservée avec `phonenumbers`;
- exemples de numéros dynamiques selon le pays déjà présents dans `InternationalPhoneInput` conservés;
- nouveau carnet d'adresses Client :
  - jusqu'à 10 adresses;
  - libellés Maison / Bureau / autre;
  - pays, ville, adresse et coordonnées GPS;
  - une seule adresse par défaut;
  - isolation stricte par utilisateur;
  - synchronisation de l'adresse par défaut avec les anciens champs `primary_address`, `primary_latitude`, `primary_longitude`;
- migration automatique de l'ancienne adresse principale vers le carnet lorsqu'elle possède déjà des coordonnées;
- nouvelle page `/client/adresses`;
- accès depuis la navigation Client et le profil;
- sélection rapide d'une adresse enregistrée lors d'une réservation à domicile;
- le rendez-vous conserve toujours une copie de l'adresse au moment de la réservation : modifier le carnet plus tard ne modifie pas l'historique;
- tests backend INT 2.

## Application

Place `apply_int2.py` à la racine de ton dépôt `ARTISAN_CI`, puis exécute :

```powershell
python .\apply_int2.py
```

Si le script est ailleurs :

```powershell
python .\apply_int2.py --root "C:\chemin\vers\ARTISAN_CI"
```

Le script est volontairement défensif : il vérifie les blocs attendus avant de les remplacer et crée une sauvegarde dans `.int2-backup/`.

## Validation backend

```powershell
cd artisan_backend
python manage.py makemigrations --check
python manage.py migrate
python manage.py check
python manage.py test accounts
```

## Validation frontend

```powershell
cd ..\artisan-frontend
npm run build
```

## Parcours manuel minimum

1. Créer un compte Client en Côte d'Ivoire.
2. Vérifier l'exemple de numéro ivoirien et l'enregistrement du téléphone.
3. Créer un compte avec France ou Canada et vérifier l'exemple dynamique.
4. Ouvrir `/client/adresses`.
5. Ajouter Maison puis Bureau.
6. Passer Bureau en adresse par défaut.
7. Vérifier qu'une seule adresse reste par défaut.
8. Ouvrir une prestation à domicile.
9. Choisir une adresse enregistrée puis créer le rendez-vous.
10. Modifier ensuite le carnet et vérifier que le rendez-vous conserve l'adresse capturée au moment de sa création.

## Important

La tentative d'écriture directe sur GitHub a été refusée par les permissions de l'intégration (HTTP 403). Aucun changement n'a donc été poussé automatiquement sur `main`.
