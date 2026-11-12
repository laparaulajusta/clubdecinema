'use client';
import { useState, useTransition } from 'react';

export default function ConfirmDeleteModal({ title, children, onConfirm, onClose }) {
  const [error, setError] = useState('');
  const [isDeleting, startDeleting] = useTransition();

  const handleConfirm = () => {
    setError('');
    startDeleting(async () => {
      try {
        await onConfirm();
        onClose();
      } catch {
        setError("No s'ha pogut eliminar. Torna-ho a provar.");
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-slate-800 border border-slate-600 rounded-xl p-6 max-w-sm w-full shadow-xl">
        <h3 className="text-slate-200 font-semibold text-base mb-2">{title}</h3>
        <p className="text-slate-400 text-sm mb-5">{children}</p>

        {error && (
          <div className="mb-4 p-3 rounded-xl text-xs font-medium border bg-rose-500/10 border-rose-500/30 text-rose-300">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 border border-slate-600 hover:bg-slate-700 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel·lar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition flex items-center gap-1.5 ${
              isDeleting
                ? 'bg-rose-500/10 text-rose-300/70 border-rose-500/20 cursor-wait'
                : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border-rose-500/30 cursor-pointer'
            }`}
          >
            {isDeleting && <span className="w-3 h-3 border-2 border-rose-300 border-t-transparent rounded-full animate-spin" />}
            {isDeleting ? 'Eliminant...' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
}
