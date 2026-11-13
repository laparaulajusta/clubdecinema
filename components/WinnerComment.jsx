'use client';
import { useState, useTransition } from 'react';
import WinnerSelect from '@/components/WinnerSelect';
import StarRating from '@/components/StarRating';
import { afegirComentari } from '@/app/actions/comments';
import { avisarComentariPublicat, obrirModalLogin } from '@/lib/events';
import { MAX_CARACTERS_COMENTARI } from '@/lib/constants';

export default function WinnerComment({ guanyadores, usuari }) {
  const [movieId, setMovieId] = useState(guanyadores[0]?.movieId ?? '');
  const [text, setText] = useState('');
  const [valoracio, setValoracio] = useState(0);
  const [error, setError] = useState('');
  const [isSaving, startSaving] = useTransition();
  const buit = !text.trim();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!usuari) {
      obrirModalLogin("Per publicar el comentari has d'iniciar sessió o registrar-te.");
      return;
    }
    if (buit) {
      setError('El comentari no pot quedar buit.');
      return;
    }
    const formData = new FormData();
    formData.append('movieId', movieId);
    formData.append('text', text.trim());
    formData.append('rating', String(valoracio));
    setError('');
    startSaving(async () => {
      try {
        const res = await afegirComentari(formData);
        if (res?.success) {
          setText('');
          setValoracio(0);
          avisarComentariPublicat(res.id);
        } else {
          setError(res?.error || "No s'ha pogut publicar el comentari.");
        }
      } catch {
        setError("S'ha produït un error inesperat.");
      }
    });
  };

  if (guanyadores.length === 0) {
    return <p className="text-sm text-slate-500">Encara no hi ha cap pel·lícula guanyadora per comentar.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <WinnerSelect opcions={guanyadores} value={movieId} onChange={setMovieId} disabled={isSaving} />

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={MAX_CARACTERS_COMENTARI}
        rows={3}
        placeholder="Què t'ha semblat la pel·lícula?"
        disabled={isSaving}
        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 shadow-inner resize-y disabled:opacity-60"
      />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-xs text-slate-400">La teva valoració:</span>
        <StarRating value={valoracio} onChange={setValoracio} disabled={isSaving} />
      </div>

      <div className="flex flex-wrap justify-between items-center gap-2">
        <span className="text-[11px] text-slate-500">
          {usuari
            ? <>Comentant com a <span className="text-slate-300 font-medium">{usuari.name}</span> · </>
            : <>Cal iniciar sessió per publicar · </>}
          {text.length}/{MAX_CARACTERS_COMENTARI}
        </span>
        <button
          type="submit"
          disabled={isSaving || buit}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-1.5 ${
            isSaving
              ? 'bg-slate-600 text-slate-300 cursor-wait'
              : buit
              ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer'
          }`}
        >
          {isSaving && <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {isSaving ? 'Publicant...' : '💬 Publicar'}
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl text-xs font-medium border bg-rose-500/10 border-rose-500/30 text-rose-300">
          {error}
        </div>
      )}
    </form>
  );
}
