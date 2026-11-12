'use client';
import { useState, useEffect, useTransition } from 'react';
import { DURADA_MISSATGES_MS } from '@/lib/constants';

export default function ConfiguracioJoc({ numPelisVotacio, maxPropostesSetmana, pelisEnVotacio, desarConfiguracio }) {
  const [numPelis, setNumPelis] = useState(String(numPelisVotacio));
  const [maxPropostes, setMaxPropostes] = useState(String(maxPropostesSetmana));
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });
  const [isSaving, startSaving] = useTransition();

  useEffect(() => {
    if (statusMsg.text) {
      const timer = setTimeout(() => {
        setStatusMsg({ text: '', type: '' });
      }, DURADA_MISSATGES_MS);
      return () => clearTimeout(timer);
    }
  }, [statusMsg]);

  const numPelisBloquejat = pelisEnVotacio > 0;
  const numPelisMostrat = numPelisBloquejat ? String(numPelisVotacio) : numPelis;
  const senseCanvis = Number(numPelisMostrat) === numPelisVotacio && Number(maxPropostes) === maxPropostesSetmana;

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startSaving(async () => {
      try {
        const res = await desarConfiguracio(formData);
        setStatusMsg({ text: res.message, type: res.success ? 'success' : 'error' });
      } catch {
        setStatusMsg({ text: "S'ha produït un error inesperat.", type: 'error' });
      }
    });
  };

  const inputClass = 'w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 shadow-inner disabled:opacity-60 disabled:cursor-not-allowed';

  return (
    <form onSubmit={handleSubmit} className="bg-slate-800 border border-slate-700 p-5 rounded-xl shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-end gap-4">
        <label className="flex-1 space-y-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pel·lícules per votació</span>
          <input
            type="number"
            name="num_pelis_votacio"
            min={1}
            step={1}
            required
            value={numPelisMostrat}
            onChange={(e) => setNumPelis(e.target.value)}
            disabled={isSaving || numPelisBloquejat}
            className={inputClass}
          />
        </label>

        <label className="flex-1 space-y-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Propostes per usuari i setmana</span>
          <input
            type="number"
            name="max_propostes_setmana"
            min={1}
            step={1}
            required
            value={maxPropostes}
            onChange={(e) => setMaxPropostes(e.target.value)}
            disabled={isSaving}
            className={inputClass}
          />
        </label>

        <button
          type="submit"
          disabled={isSaving || senseCanvis}
          className={`px-5 py-2 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-1.5 ${
            isSaving
              ? 'bg-slate-600 text-slate-300 cursor-wait'
              : senseCanvis
              ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer'
          }`}
        >
          {isSaving && <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {isSaving ? 'Desant...' : '💾 Desar'}
        </button>
      </div>

      {numPelisBloquejat && (
        <p className="mt-3 text-[11px] text-amber-400">
          El nombre de pel·lícules per votació no es pot canviar mentre hi hagi pel·lícules en votació.
        </p>
      )}

      {statusMsg.text && (
        <div className={`mt-3 p-3 rounded-xl text-xs font-medium border ${
          statusMsg.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}>
          {statusMsg.text}
        </div>
      )}
    </form>
  );
}
