import { Link } from 'react-router-dom';
import { getRoleHomePath, getUserRole, isAuthenticated } from '../../utils/auth';

export default function NotFoundPage() {
  const destination = isAuthenticated() ? getRoleHomePath(getUserRole()) : '/';

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <section className="w-full max-w-md bg-white border border-gray-200 rounded-xl shadow-sm p-8 text-center">
        <p className="text-sm font-semibold text-indigo-600">Erreur 404</p>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Page introuvable</h1>
        <p className="mt-3 text-gray-600">
          Cette page n'existe pas ou a été déplacée.
        </p>
        <Link
          to={destination}
          className="inline-flex mt-6 px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
        >
          Revenir à ARTISAN_CI
        </Link>
      </section>
    </main>
  );
}
