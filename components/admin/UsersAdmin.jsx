'use client';
import { useState, useTransition } from 'react';
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal';

function HistorialVots({ vots }) {
  if (vots.length === 0) {
    return <p className="text-xs text-slate-500">Encara no ha votat en cap ronda.</p>;
  }

  return (
    <ul className="max-h-60 overflow-y-auto pr-1 space-y-1.5">
      {vots.map(vot => (
        <li key={vot._id} className="flex items-center gap-2.5 bg-slate-900/60 border border-slate-700/50 rounded-lg p-1.5">
          {vot.poster ? (
            <img src={`https://image.tmdb.org/t/p/w92${vot.poster}`} alt={vot.title} className="w-6 h-9 object-cover rounded flex-shrink-0" />
          ) : (
            <div className="w-6 h-9 bg-slate-700 rounded flex-shrink-0" />
          )}
          <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-medium flex-shrink-0">{vot.ronda}</span>
          <span className="text-xs text-slate-200">{vot.title}</span>
          {vot.guanyadora && <span title="Va guanyar la ronda" className="ms-auto text-[11px] flex-shrink-0">🏆</span>}
        </li>
      ))}
    </ul>
  );
}

function FilaUsuari({ usuari, esTu, canviarAdmin, onEliminar }) {
  const [mostrarVots, setMostrarVots] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const canviarRol = () => {
    const formData = new FormData();
    formData.append('id', usuari._id);
    formData.append('isAdmin', String(!usuari.isAdmin));
    setError('');
    startTransition(async () => {
      try {
        const res = await canviarAdmin(formData);
        if (!res?.success) setError(res?.error || "No s'ha pogut canviar el rol.");
      } catch {
        setError("S'ha produït un error inesperat.");
      }
    });
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-md">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm flex items-center flex-wrap gap-1.5">
            <span className="font-semibold text-slate-100">{usuari.name}</span>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <span className="text-xs text-slate-500">@{usuari.username}</span>
                {esTu && <span className="text-[10px] text-slate-500">(tu)</span>}
              </div>
              {usuari.isAdmin && (
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded font-medium">Admin</span>
              )}
            </div>
          </p>
          <span className="text-[11px] text-slate-500 mt-1">Alta: {usuari.alta}</span>
        </div>

        <div className="flex-1 flex flex-row-reverse flex-wrap justify-start gap-2">
          <button
            type="button"
            onClick={() => setMostrarVots(v => !v)}
            aria-expanded={mostrarVots}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 ${
              mostrarVots
                ? 'bg-slate-700 text-white border-slate-600'
                : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            🗳️ Vots ({usuari.vots.length})
            <span className={`text-[9px] transition-transform ${mostrarVots ? 'rotate-180' : ''}`}>▼</span>
          </button>

          {!esTu && (
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={canviarRol}
                disabled={isPending}
                title={usuari.isAdmin ? 'Eliminar administrador' : 'Fer administrador'}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition flex items-center gap-1.5 ${
                  isPending
                    ? 'bg-slate-600 text-slate-300 border-slate-600 cursor-wait'
                    : usuari.isAdmin
                    ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/30 cursor-pointer'
                    : 'bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border-indigo-500/30 cursor-pointer'
                }`}
              >
                {isPending && <span className="w-3 h-3 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />}
                {isPending ? 'Desant...' : usuari.isAdmin ? '👤' : '👑'}
              </button>

              <button
                type="button"
                onClick={() => onEliminar(usuari)}
                title="Eliminar usuari"
                className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                🗑️
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-3 p-2.5 rounded-xl text-xs font-medium border bg-rose-500/10 border-rose-500/30 text-rose-300">{error}</div>
      )}

      {mostrarVots && (
        <div className="mt-3 pt-3 border-t border-slate-700/50">
          <HistorialVots vots={usuari.vots} />
        </div>
      )}
    </div>
  );
}

export default function UsersAdmin({ usuaris, usuariActualId, canviarAdmin, eliminarUsuari }) {
  const [usuariAEliminar, setUsuariAEliminar] = useState(null);

  const eliminar = () => {
    const formData = new FormData();
    formData.append('id', usuariAEliminar._id);
    return eliminarUsuari(formData);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold border-b border-slate-800 pb-3">
        👥 <span>Usuaris</span> <span className="text-indigo-400 text-base font-medium ml-1">({usuaris.length})</span>
      </h2>

      {usuaris.length === 0 ? (
        <p className="text-slate-500 text-sm">Encara no hi ha cap usuari registrat.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
          {usuaris.map(u => (
            <FilaUsuari
              key={u._id}
              usuari={u}
              esTu={u._id === usuariActualId}
              canviarAdmin={canviarAdmin}
              onEliminar={setUsuariAEliminar}
            />
          ))}
        </div>
      )}

      {usuariAEliminar && (
        <ConfirmDeleteModal
          title="Eliminar usuari"
          onConfirm={eliminar}
          onClose={() => setUsuariAEliminar(null)}
        >
          Segur que vols eliminar <span className="text-slate-200 font-medium">{usuariAEliminar.name}</span> (@{usuariAEliminar.username})?
          També s'eliminaran els seus comentaris (amb les respostes que hagin rebut) i els seus vots; si ha votat a la ronda actual, el vot es descomptarà.
          Aquesta acció no es pot desfer.
        </ConfirmDeleteModal>
      )}
    </div>
  );
}
