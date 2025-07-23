import { useEffect, useState } from 'react';
import axios from '../../utils/axiosInstance';
import ArtisanNavbar from '../../components/ArtisanNavbar';

export default function ArtisanCertifications() {
  const [certifs, setCertifs] = useState([]);
  const [form, setForm] = useState({ nom: '', organisme: '', valide_jusquau: '', fichier: null });
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchCertifs = async () => {
    try {
      const res = await axios.get('/certifications/mes/');
      setCertifs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append('nom', form.nom);
    data.append('organisme', form.organisme);
    if (form.valide_jusquau) data.append('valide_jusquau', form.valide_jusquau);
    if (form.fichier) data.append('fichier', form.fichier);

    try {
      if (editingId) {
        await axios.patch(`/certifications/${editingId}/modifier/`, data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setMessage("Certification modifiée ✅");
      } else {
        await axios.post('/certifications/ajouter/', data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setMessage("Ajoutée avec succès ✅");
      }

      setForm({ nom: '', organisme: '', valide_jusquau: '', fichier: null });
      setEditingId(null);
      fetchCertifs();
    } catch (err) {
      console.error(err);
      setMessage("Erreur lors de l'enregistrement ❌");
    }
  };

  const handleEdit = (certif) => {
    setForm({
      nom: certif.nom,
      organisme: certif.organisme,
      valide_jusquau: certif.valide_jusquau || '',
      fichier: null,
    });
    setEditingId(certif.id);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Supprimer cette certification ?")) {
      try {
        await axios.delete(`/certifications/${id}/supprimer/`);
        fetchCertifs();
      } catch (err) {
        console.error(err);
      }
    }
  };

  useEffect(() => {
    fetchCertifs();
  }, []);

  return (
    <div>
      <ArtisanNavbar />
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4">Mes Certifications</h2>

        {message && <p className="text-blue-600 text-center mb-3">{message}</p>}

        <form onSubmit={handleSubmit} className="grid gap-4 mb-6">
          <input
            type="text"
            placeholder="Nom"
            value={form.nom}
            onChange={(e) => setForm({ ...form, nom: e.target.value })}
            className="border p-2 rounded"
            required
          />
          <input
            type="text"
            placeholder="Organisme"
            value={form.organisme}
            onChange={(e) => setForm({ ...form, organisme: e.target.value })}
            className="border p-2 rounded"
            required
          />
          <input
            type="date"
            value={form.valide_jusquau}
            onChange={(e) => setForm({ ...form, valide_jusquau: e.target.value })}
            className="border p-2 rounded"
          />
          <input
            type="file"
            onChange={(e) => setForm({ ...form, fichier: e.target.files[0] })}
            className="border p-2 rounded"
          />
          <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            {editingId ? 'Mettre à jour' : 'Ajouter'}
          </button>
        </form>

        {loading ? (
          <p>Chargement...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {certifs.map(cert => (
              <div key={cert.id} className="border rounded p-4 bg-white shadow">
                <h3 className="text-lg font-bold">{cert.nom}</h3>
                <p className="text-sm text-gray-600">{cert.organisme}</p>
                {cert.valide_jusquau && (
                  <p className="text-xs italic text-gray-500">Date d'optention {cert.valide_jusquau}</p>
                )}
                {cert.fichier && (
                  <a href={cert.fichier} target="_blank" rel="noreferrer" className="text-blue-500 text-sm underline mt-1 block">
                    📎 Voir le fichier
                  </a>
                )}
                <div className="mt-2 flex justify-end space-x-2">
                  <button onClick={() => handleEdit(cert)} className="text-blue-600 text-sm hover:underline">Modifier</button>
                  <button onClick={() => handleDelete(cert.id)} className="text-red-500 text-sm hover:underline">Supprimer</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
