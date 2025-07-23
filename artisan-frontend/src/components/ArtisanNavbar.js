import { Link } from 'react-router-dom';

export default function ArtisanNavbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow px-4 py-3 flex justify-between items-center">
      <h1 className="text-xl font-bold">Espace Artisan</h1>
      <ul className="flex space-x-4 text-sm">
        <li><Link to="/artisan/dashboard" className="hover:text-blue-600">Accueil</Link></li>
        <li><Link to="/artisan/services" className="hover:text-blue-600">Mes Prestations</Link></li>
        <li><Link to="/artisan/rdv" className="hover:text-blue-600">Mes Rendez-vous</Link></li>
        <li><Link to="/artisan/portfolio" className="hover:text-blue-600">Mon Portfolio</Link></li>
        <li><Link to="/artisan/certifications" className="hover:text-blue-600">Mes Certifications</Link></li>
        <li><Link to="/artisan/paiements" className="hover:text-blue-600">Paiements</Link></li>
        <li><Link to="/artisan/profil" className="hover:text-blue-600">Profil</Link></li>
        {/* 🔵 Nouvelle option Messagerie */}
        <li><Link to="/artisan/mes-conversations" className="hover:text-blue-600">Messagerie</Link></li>
        <li><Link to="/" className="text-red-500">Déconnexion</Link></li>
      </ul>
    </nav>
  );
}
