'use client';
import { useState, useTransition } from 'react';
import { canviarNom, canviarContrasenya, tancarSessio } from '@/app/actions/auth';
import { MIN_CARACTERS_CONTRASENYA, MAX_CARACTERS_NOM } from '@/lib/constants';

const inputClass = 'w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 shadow-inner disabled:opacity-60';
const etiquetaClass = 'block text-xs font-bold text-slate-400 uppercase tracking-wider';

function useAccioFormulari(accio, textExit) {
  const [missatge, setMissatge] = useState(null);
  const [pendent, startTransition] = useTransition();

  const executar = (formData, onExit) => {
    setMissatge(null);
    startTransition(async () => {
      try {
        const res = await accio(formData);
        if (res?.success) {
          setMissatge({ exit: true, text: textExit });
          onExit?.();
        } else {
          setMissatge({ exit: false, text: res?.error || "No s'han pogut desar els canvis." });
        }
      } catch {
        setMissatge({ exit: false, text: "S'ha produït un error inesperat." });
      }
    });
  };

  return { missatge, pendent, executar };
}

function Missatge({ missatge }) {
  if (!missatge) return null;
  return (
    <div className={`p-2.5 rounded-xl text-xs font-medium border ${
      missatge.exit ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
    }`}>
      {missatge.text}
    </div>
  );
}

function BotoDesar({ pendent, disabled, text, textPendent }) {
  return (
    <button
      type="submit"
      disabled={pendent || disabled}
      className={`px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 flex-shrink-0 ${
        pendent
          ? 'bg-slate-600 text-slate-300 cursor-wait'
          : disabled
          ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
          : 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer'
      }`}
    >
      {pendent && <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
      {pendent ? textPendent : text}
    </button>
  );
}

export default function AccountPanel({ usuari, onSessioTancada }) {
  const [nom, setNom] = useState(usuari.name);
  const accioNom = useAccioFormulari(canviarNom, 'Nom actualitzat.');
  const accioContrasenya = useAccioFormulari(canviarContrasenya, "Contrasenya canviada. Les altres sessions obertes s'han tancat.");
  const [sortint, startSortint] = useTransition();

  const nomSenseCanvis = !nom.trim() || nom.trim() === usuari.name;

  const desarNom = (e) => {
    e.preventDefault();
    accioNom.executar(new FormData(e.currentTarget));
  };

  const desarContrasenya = (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    accioContrasenya.executar(new FormData(form), () => form.reset());
  };

  const sortir = () => {
    startSortint(async () => {
      await tancarSessio();
      onSessioTancada();
    });
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-300">
        Has iniciat sessió com a <span className="font-semibold text-slate-100">{usuari.name}</span>{' '}
        <span className="text-slate-500">@{usuari.username}</span>
        {usuari.isAdmin && (
          <span className="ml-2 text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded font-medium">Admin</span>
        )}
      </p>

      <form onSubmit={desarNom} className="space-y-2">
        <label htmlFor="compte-nom" className={etiquetaClass}>Nom</label>
        <div className="flex gap-2">
          <input
            id="compte-nom"
            name="name"
            type="text"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            maxLength={MAX_CARACTERS_NOM}
            autoComplete="name"
            required
            disabled={accioNom.pendent}
            className={inputClass}
          />
          <BotoDesar pendent={accioNom.pendent} disabled={nomSenseCanvis} text="💾 Desar" textPendent="Desant..." />
        </div>
        <Missatge missatge={accioNom.missatge} />
      </form>

      <form onSubmit={desarContrasenya} className="space-y-2">
        <span className={etiquetaClass}>Contrasenya</span>
        <input type="text" name="username" value={usuari.username} autoComplete="username" readOnly hidden />
        <input
          name="actual"
          type="password"
          placeholder="Contrasenya actual"
          autoComplete="current-password"
          required
          disabled={accioContrasenya.pendent}
          className={inputClass}
        />
        <input
          name="nova"
          type="password"
          placeholder={`Contrasenya nova (mínim ${MIN_CARACTERS_CONTRASENYA} caràcters)`}
          autoComplete="new-password"
          minLength={MIN_CARACTERS_CONTRASENYA}
          required
          disabled={accioContrasenya.pendent}
          className={inputClass}
        />
        <BotoDesar pendent={accioContrasenya.pendent} text="Canviar contrasenya" textPendent="Canviant..." />
        <Missatge missatge={accioContrasenya.missatge} />
      </form>

      <button
        type="button"
        onClick={sortir}
        disabled={sortint}
        className={`w-full px-4 py-2 rounded-xl text-sm font-semibold border transition flex items-center justify-center gap-1.5 ${
          sortint
            ? 'bg-rose-500/10 text-rose-300/70 border-rose-500/20 cursor-wait'
            : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border-rose-500/30 cursor-pointer'
        }`}
      >
        {sortint && <span className="w-3 h-3 border-2 border-rose-300 border-t-transparent rounded-full animate-spin" />}
        {sortint ? 'Tancant la sessió...' : '➡️ Tancar sessió'}
      </button>
    </div>
  );
}
