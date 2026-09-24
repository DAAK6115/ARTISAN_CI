import { Link } from 'react-router-dom';
import { getRoleHomePath, getUserRole, isAuthenticated } from '../../utils/auth';

export default function ForbiddenPage() {
  const destination = isAuthenticated() ? getRoleHomePath(getUserRole()) : '/';

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <section className="w-full max-w-md bg-white border border-gray-200 rounded-xl shadow-sm p-8 text-center">
        <div className="text-4xl mb-4" aria-hidden="true">🔒</div>
        <h1 className="text-2xl font-bold text-gray-900">Accès non autorisé</h1>
        <p className="mt-3 text-gray-600">
          Votre compte n'a pas accès à cette section d'ARTISAN_CI.
        </p>
        <Link
          to={destination}
          className="inline-flex mt-6 px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
        >
          Retour à mon espace
        </Link>
      </section>
    </main>
  );
}
