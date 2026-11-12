'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import AuthForm from '@/components/AuthForm';
import AccountPanel from '@/components/AccountPanel';
import { escoltarObrirModalLogin } from '@/lib/events';

export default function UserMenu({ usuari }) {
  const [obert, setObert] = useState(false);
  const [motiu, setMotiu] = useState('');

  useEffect(() => escoltarObrirModalLogin((motiuNou) => {
    setMotiu(motiuNou);
    setObert(true);
  }), []);

  useEffect(() => {
    if (!obert) return;
    const tancarAmbEscape = (e) => { if (e.key === 'Escape') setObert(false); };
    document.addEventListener('keydown', tancarAmbEscape);
    return () => document.removeEventListener('keydown', tancarAmbEscape);
  }, [obert]);

  const obrir = () => {
    setMotiu('');
    setObert(true);
  };
  const tancar = () => setObert(false);

  return (
    <>
      <button
        type="button"
        onClick={obrir}
        title={usuari ? `Sessió iniciada com a ${usuari.name}` : "Inicia sessió o registra't"}
        className={`ml-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 sm:px-3 py-1.5 rounded-lg border transition cursor-pointer flex items-center gap-2 ${
          usuari ? 'border-emerald-500/40' : 'border-slate-700'
        }`}
      >
        <span>👤</span>
        {usuari && <span className="hidden sm:inline text-sm font-medium max-w-[8rem] truncate">{usuari.name}</span>}
      </button>

      {obert && createPortal(
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] px-4"
          onClick={(e) => { if (e.target === e.currentTarget) tancar(); }}
        >
          <div className="bg-slate-800 border border-slate-600 rounded-xl p-6 max-w-sm w-full max-h-[90vh] overflow-y-auto shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-slate-200 font-semibold text-base">👤 {usuari ? 'El meu compte' : 'Accedeix al club'}</h3>
              <button
                type="button"
                onClick={tancar}
                aria-label="Tancar"
                className="text-slate-400 hover:text-white cursor-pointer transition"
              >
                ✕
              </button>
            </div>

            {usuari ? (
              <AccountPanel usuari={usuari} onSessioTancada={tancar} />
            ) : (
              <>
                {motiu && (
                  <p className="p-3 rounded-xl text-xs font-medium border bg-indigo-500/10 border-indigo-500/30 text-indigo-200">{motiu}</p>
                )}
                <AuthForm onSuccess={tancar} />
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
