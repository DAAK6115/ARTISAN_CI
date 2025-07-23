from locust import HttpUser, task, between
import random
import string

def random_email():
    return ''.join(random.choices(string.ascii_lowercase, k=7)) + "@test.com"

class ArtisanClientTest(HttpUser):
    wait_time = between(1, 2)  # pause entre chaque test

    def on_start(self):
        # Création de compte (artisan)
        email = random_email()
        password = "azerty123"
        response = self.client.post("/api/accounts/register/", json={
            "nom": "Test",
            "prenom": "Artisan",
            "email": email,
            "password": password,
            "confirm_password": password,
            "type_utilisateur": "artisan"
        })
        if response.status_code == 201:
            print("✅ Compte créé avec succès")

        # Connexion
        login = self.client.post("/api/accounts/login/", json={
            "email": email,
            "password": password
        })
        self.token = login.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}

    @task
    def prise_de_rendez_vous(self):
        # Simulation d’une prise de rendez-vous
        self.client.post("api/rendezvous/", json={
            "prestation_id": 1,
            "date": "2025-06-03",
            "heure": "10:00"
        }, headers=self.headers)

    @task
    def envoi_message(self):
        # Simulation d’un envoi de message
        self.client.post("api/messages/", json={
            "receiver_id": 2,
            "contenu": "Bonjour, je suis intéressé par votre service."
        }, headers=self.headers)

    @task
    def ajout_prestation(self):
        # Simulation d’ajout de prestation
        self.client.post("api/prestations/", json={
            "titre": "Coiffure homme",
            "description": "Coupe simple",
            "prix": 5000
        }, headers=self.headers)

    @task
    def notation(self):
        # Simulation d'une notation d’un artisan
        self.client.post("api/avis/", json={
            "artisan_id": 2,
            "note": 4,
            "commentaire": "Très satisfait du service."
        }, headers=self.headers)
