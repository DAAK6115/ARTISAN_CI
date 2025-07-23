export default function Dashboard() {
    const username = localStorage.getItem('user') || 'Utilisateur';
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <h1 className="text-2xl font-bold">Bienvenue, {username} 👋</h1>
        <p className="mt-2 text-gray-600">Ceci est votre tableau de bord personnel.</p>
      </div>
    );
  }
  