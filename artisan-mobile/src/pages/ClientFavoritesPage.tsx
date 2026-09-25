import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart, Search, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MobileTopBar } from '../components/MobileTopBar';
import { ServiceCard } from '../components/ServiceCard';
import { getFavorites, toggleFavorite } from '../features/client/client.api';

export function ClientFavoritesPage() {
  const queryClient = useQueryClient();
  const favorites = useQuery({ queryKey: ['client-favorites'], queryFn: getFavorites });
  const remove = useMutation({
    mutationFn: toggleFavorite,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['client-favorites'] })
  });

  return (
    <div>
      <MobileTopBar />
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--artisan-green)]">Sélection</p>
          <h1 className="mt-1 text-2xl font-black tracking-[-0.04em]">Mes favoris</h1>
        </div>
        <span className="grid size-11 place-items-center rounded-2xl bg-[var(--artisan-orange-soft)] text-[var(--artisan-orange)]"><Heart size={20} fill="currentColor" /></span>
      </div>

      {favorites.isLoading ? <div className="mt-5 h-32 animate-pulse rounded-3xl bg-white" /> : null}
      {favorites.isError ? <div className="mt-5 rounded-3xl bg-[var(--artisan-danger-soft)] p-4 text-sm font-semibold text-[#A83228]">Impossible de charger vos favoris.</div> : null}

      {!favorites.isLoading && (favorites.data?.length ?? 0) === 0 ? (
        <div className="mt-5 rounded-[30px] border border-black/5 bg-white p-6 text-center shadow-sm">
          <Heart className="mx-auto text-[var(--artisan-muted)]" size={28} />
          <p className="mt-3 font-black">Aucun favori pour le moment</p>
          <p className="mt-2 text-sm leading-6 text-[var(--artisan-muted)]">Ajoutez les prestations que vous souhaitez retrouver rapidement.</p>
          <Link to="/client/recherche" className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--artisan-green)] px-5 text-sm font-black text-white"><Search size={17} /> Rechercher</Link>
        </div>
      ) : null}

      <div className="mt-5 space-y-4">
        {favorites.data?.map((favorite) => (
          <div key={favorite.id}>
            <ServiceCard service={favorite.service} />
            <button
              type="button"
              onClick={() => remove.mutate(favorite.service.id)}
              disabled={remove.isPending}
              className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--artisan-danger-soft)] px-4 text-xs font-black text-[#A83228] disabled:opacity-50"
            ><Trash2 size={15} /> Retirer des favoris</button>
          </div>
        ))}
      </div>
    </div>
  );
}
