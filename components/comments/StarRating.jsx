'use client';
import { useState } from 'react';

export default function StarRating({ value, onChange, max = 10, disabled = false }) {
  const [hover, setHover] = useState(0);
  const mostrades = hover || value;

  return (
    <div className="flex items-center gap-2">
      <div className="flex" onMouseLeave={() => setHover(0)}>
        {Array.from({ length: max }, (_, i) => {
          const estrella = i + 1;
          const plena = estrella <= mostrades;
          return (
            <button
              key={estrella}
              type="button"
              disabled={disabled}
              onMouseEnter={() => setHover(estrella)}
              onClick={() => onChange(estrella === value ? 0 : estrella)}
              aria-label={`${estrella} de ${max}`}
              aria-pressed={estrella <= value}
              className={`text-xl leading-none px-0.5 transition-colors cursor-pointer disabled:cursor-not-allowed ${
                plena ? 'text-amber-400' : 'text-slate-600 hover:text-slate-500'
              }`}
            >
              {plena ? '★' : '☆'}
            </button>
          );
        })}
      </div>
      <span className="text-xs text-slate-400 w-10">{mostrades > 0 ? `${mostrades}/${max}` : '—'}</span>
    </div>
  );
}
