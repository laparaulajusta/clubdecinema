'use client';
import { useEffect, useRef, useState } from 'react';

const TOTES = '';

function filtrar(opcions, filtre) {
  const text = filtre.trim().toLowerCase();
  if (!text) return opcions;
  return opcions.filter(o => o.title.toLowerCase().includes(text) || (o.roundName ?? '').toLowerCase().includes(text));
}

function Opcio({ opcio, seleccionada = false, seleccio = false }) {
  return (
    <>
      {!seleccio && (
        opcio.poster ? (
          <img src={`https://image.tmdb.org/t/p/w92${opcio.poster}`} alt="" className="w-7 h-10 object-cover rounded shadow flex-shrink-0" />
        ) : (
          <div className="w-7 h-10 bg-slate-700 rounded flex-shrink-0 flex items-center justify-center text-sm">
            {opcio.movieId === TOTES && '🎬'}
          </div>
        )
      )}
      <span className={`min-w-0 flex-1 flex ${seleccio ? 'flex-row flex-row-reverse gap-2 justify-end' : 'flex-col items-start gap-1'}`}>
        {opcio.roundName && (
          <span className="text-[10px] leading-none bg-amber-500/20 text-amber-300 px-1.5 py-1 rounded font-medium uppercase tracking-wide">
            {opcio.roundName}
          </span>
        )}
        <span className={`text-sm font-semibold truncate max-w-full ${seleccionada ? 'text-indigo-300' : 'text-slate-100'}`}>
          {opcio.title}
        </span>
      </span>
      {opcio.total !== undefined && (
        <span className="text-xs text-slate-400 flex-shrink-0" title="Comentaris i respostes">💬 {opcio.total}</span>
      )}
    </>
  );
}

export default function WinnerSelect({ opcions, value, onChange, disabled = false, opcioTotes = null }) {
  const [obert, setObert] = useState(false);
  const [filtre, setFiltre] = useState('');
  const [actiu, setActiu] = useState(0);
  const contenidorRef = useRef(null);
  const botoRef = useRef(null);
  const inputRef = useRef(null);
  const llistaRef = useRef(null);

  const llistaCompleta = opcioTotes ? [{ ...opcioTotes, movieId: TOTES }, ...opcions] : opcions;
  // Amb text al filtre, l'opció "totes" s'amaga perquè Enter triï la primera coincidència
  const visibles = filtre.trim() ? filtrar(opcions, filtre) : llistaCompleta;
  const seleccionada = llistaCompleta.find(o => o.movieId === value);

  useEffect(() => {
    if (!obert) return;
    const tancarSiClicaFora = (e) => {
      if (!contenidorRef.current?.contains(e.target)) setObert(false);
    };
    document.addEventListener('mousedown', tancarSiClicaFora);
    return () => document.removeEventListener('mousedown', tancarSiClicaFora);
  }, [obert]);

  useEffect(() => {
    if (obert) llistaRef.current?.children[actiu]?.scrollIntoView({ block: 'nearest' });
  }, [obert, actiu]);

  const obrir = () => {
    setFiltre('');
    setActiu(Math.max(0, llistaCompleta.findIndex(o => o.movieId === value)));
    setObert(true);
  };

  const tancar = () => {
    setObert(false);
    botoRef.current?.focus();
  };

  const seleccionar = (opcio) => {
    onChange(opcio.movieId);
    tancar();
  };

  const canviarFiltre = (valor) => {
    setFiltre(valor);
    setActiu(0);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiu(i => Math.min(i + 1, visibles.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiu(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (visibles[actiu]) seleccionar(visibles[actiu]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      tancar();
    }
  };

  return (
    <div ref={contenidorRef} className="relative">
      <button
        ref={botoRef}
        type="button"
        onClick={() => (obert ? setObert(false) : obrir())}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={obert}
        className={`w-full flex items-center gap-3 bg-slate-900 border rounded-xl px-3 py-2 text-left shadow-inner transition focus:outline-none focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer ${
          obert ? 'border-indigo-500' : 'border-slate-700 hover:border-slate-600'
        }`}
      >
        {seleccionada
          ? <Opcio opcio={seleccionada} seleccio={true} />
          : <span className="flex-1 text-sm text-slate-500">Selecciona una pel·lícula</span>}
        <span className={`text-slate-400 text-xs flex-shrink-0 transition-transform ${obert ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {obert && (
        <div className="absolute z-[45] mt-1 w-full bg-slate-900 border border-slate-700 rounded-xl shadow-xl shadow-black/50 overflow-hidden">
          <div className="p-2 border-b border-slate-800">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={filtre}
                onChange={(e) => canviarFiltre(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Filtra per títol o mes..."
                autoFocus
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-3 pr-8 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              />
              {filtre && (
                <button
                  type="button"
                  onClick={() => { canviarFiltre(''); inputRef.current?.focus(); }}
                  aria-label="Netejar el filtre"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer transition text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {visibles.length === 0 ? (
            <p className="px-3 py-3 text-xs text-slate-500">Cap pel·lícula coincideix amb el filtre.</p>
          ) : (
            <ul ref={llistaRef} role="listbox" className="max-h-72 overflow-y-auto py-1">
              {visibles.map((opcio, i) => {
                const esSeleccionada = opcio.movieId === value;
                return (
                  <li
                    key={opcio.movieId || 'totes'}
                    role="option"
                    aria-selected={esSeleccionada}
                    onMouseEnter={() => setActiu(i)}
                    onClick={() => seleccionar(opcio)}
                    className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${i === actiu ? 'bg-slate-800' : ''}`}
                  >
                    <Opcio opcio={opcio} seleccionada={esSeleccionada} />
                    {esSeleccionada && <span className="text-indigo-400 text-sm flex-shrink-0">✓</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
