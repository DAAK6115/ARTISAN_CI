import { Link } from 'react-router-dom';
import AppIcon from './AppIcon';
import BrandLogo from './BrandLogo';
import { getRoleHomePath, getUserRole, isAuthenticated } from '../utils/auth';

export default function PublicHeader() {
  const connected = isAuthenticated();
  const homePath = connected ? getRoleHomePath(getUserRole()) : '/login';

  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="flex min-w-0 items-center" aria-label="Accueil Artisan CI">
          <BrandLogo variant="horizontal" imageClassName="h-12 w-auto sm:h-14" />
        </Link>

        <nav className="flex items-center gap-2 text-sm font-semibold">
          <Link to="/prestations" className="hidden rounded-xl px-3 py-2 text-[#34423B] hover:bg-[#F1F4F2] sm:inline-flex">
            Prestations
          </Link>
          {connected ? (
            <Link to={homePath} className="inline-flex items-center gap-2 rounded-xl bg-[#0B6B50] px-4 py-2.5 text-white shadow-sm hover:bg-[#095C45]">
              Mon espace
              <AppIcon name="arrow" className="h-4 w-4" />
            </Link>
          ) : (
            <>
              <Link to="/login" className="rounded-xl px-3 py-2 text-[#34423B] hover:bg-[#F1F4F2]">Connexion</Link>
              <Link to="/register" className="hidden rounded-xl bg-[#0B6B50] px-4 py-2.5 text-white shadow-sm hover:bg-[#095C45] sm:inline-flex">Créer un compte</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
