import React from 'react';

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    if (process.env.NODE_ENV !== 'production') {
      // Les détails techniques restent réservés au développeur.
      console.error('Erreur React non gérée', error, info);
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="min-h-screen bg-[#FAF9F6] px-4 py-16">
        <div className="mx-auto max-w-lg rounded-[28px] border border-black/5 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#FFF0EE] text-2xl">!</div>
          <h1 className="mt-5 text-2xl font-black text-[#111815]">Impossible d’afficher cette page</h1>
          <p className="mt-3 text-sm leading-6 text-[#66736D]">
            Une erreur inattendue est survenue. Vos données n’ont pas été affichées publiquement.
            Rechargez la page ou revenez à l’accueil.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-xl bg-[#0B6B50] px-5 py-3 text-sm font-bold text-white"
            >
              Recharger
            </button>
            <button
              type="button"
              onClick={() => window.location.assign('/')}
              className="rounded-xl bg-[#F1F4F2] px-5 py-3 text-sm font-bold text-[#33443B]"
            >
              Retour à l’accueil
            </button>
          </div>
        </div>
      </main>
    );
  }
}
