'use client';
import { useState, useTransition } from 'react';
import { iniciarSessio, registrarUsuari } from '@/app/actions/auth';
import { MIN_CARACTERS_CONTRASENYA, MAX_CARACTERS_NOM } from '@/lib/constants';

const inputClass = 'w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 shadow-inner disabled:opacity-60';

export default function AuthForm({ onSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' o 'registre'
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const esRegistre = mode === 'registre';

  const canviarMode = (nouMode) => {
    setMode(nouMode);
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError('');
    startTransition(async () => {
      try {
        const res = esRegistre ? await registrarUsuari(formData) : await iniciarSessio(formData);
        if (res?.success) onSuccess?.();
        else setError(res?.error || "No s'ha pogut completar l'operació.");
      } catch {
        setError("S'ha produït un error inesperat.");
      }
    });
  };

  const tabClass = (actiu) => `px-3 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
    actiu ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'
  }`;

  return (
    <div className="space-y-3">
      <div className="flex h-8 w-fit bg-slate-900 border border-slate-700 rounded-xl p-1">
        <button type="button" onClick={() => canviarMode('login')} className={tabClass(!esRegistre)}>
          Iniciar sessió
        </button>
        <button type="button" onClick={() => canviarMode('registre')} className={tabClass(esRegistre)}>
          Registrar-me
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          name="username"
          type="text"
          placeholder="Usuari"
          autoComplete="username"
          autoCapitalize="none"
          autoFocus
          required
          disabled={isPending}
          className={inputClass}
        />
        {esRegistre && (
          <input
            name="name"
            type="text"
            placeholder="Nom"
            autoComplete="name"
            maxLength={MAX_CARACTERS_NOM}
            required
            disabled={isPending}
            className={inputClass}
          />
        )}
        <input
          name="password"
          type="password"
          placeholder={esRegistre ? `Contrasenya (mínim ${MIN_CARACTERS_CONTRASENYA} caràcters)` : 'Contrasenya'}
          autoComplete={esRegistre ? 'new-password' : 'current-password'}
          minLength={esRegistre ? MIN_CARACTERS_CONTRASENYA : undefined}
          required
          disabled={isPending}
          className={inputClass}
        />

        {error && (
          <div className="p-3 rounded-xl text-xs font-medium border bg-rose-500/10 border-rose-500/30 text-rose-300">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className={`w-full px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-1.5 ${
            isPending ? 'bg-slate-600 text-slate-300 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer'
          }`}
        >
          {isPending && <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {isPending
            ? (esRegistre ? 'Creant el compte...' : 'Entrant...')
            : (esRegistre ? 'Crear compte' : 'Entrar')}
        </button>
      </form>
    </div>
  );
}
