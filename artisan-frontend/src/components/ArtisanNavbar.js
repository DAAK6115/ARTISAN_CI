import { Link, useLocation } from 'react-router-dom';
import LogoutButton from './LogoutButton';

export default function ArtisanNavbar() {
  const location = useLocation();
  const isActive = (path) => location.pathname.startsWith(path);
  const linkClass = (path) => isActive(path)
    ? 'text-blue-700 font-semibold'
    : 'hover:text-blue-600';

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow px-4 py-3 flex flex-wrap gap-3 justify-between items-center">
      <h1 className="text-xl font-bold">Espace Artisan</h1>
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <li><Link to="/artisan/dashboard" className={linkClass('/artisan/dashboard')}>Accueil</Link></li>
        <li><Link to="/artisan/services" className={linkClass('/artisan/services')}>Mes Prestations</Link></li>
        <li><Link to="/artisan/rdv" className={linkClass('/artisan/rdv')}>Mes Rendez-vous</Link></li>
        <li><Link to="/artisan/portfolio" className={linkClass('/artisan/portfolio')}>Mon Portfolio</Link></li>
        <li><Link to="/artisan/certifications" className={linkClass('/artisan/certifications')}>Mes Certifications</Link></li>
        <li><Link to="/artisan/paiements" className={linkClass('/artisan/paiements')}>Paiements</Link></li>
        <li><Link to="/artisan/profil" className={linkClass('/artisan/profil')}>Profil</Link></li>
        <li><Link to="/artisan/mes-conversations" className={linkClass('/artisan/mes-conversations')}>Messagerie</Link></li>
        <li>
          <LogoutButton className="text-red-600 hover:text-red-700 disabled:opacity-60" />
        </li>
      </ul>
    </nav>
  );
}
