'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import CommentThread from '@/components/comments/CommentThread';
import WinnerSelect from '@/components/comments/WinnerSelect';
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal';
import { eliminarComentari } from '@/app/actions/comments';
import { escoltarComentariPublicat } from '@/lib/events';
import { COMENTARIS_PER_TANDA } from '@/lib/constants';

const SENSE_PELI = 'sense-peli';
const ESPERA_TANDA_MS = 400;
const DURADA_DESTACAT_MS = 2500;

const clauPeli = (fil) => fil.movie?._id ?? SENSE_PELI;
const comptarComentaris = (fils) => fils.reduce((total, fil) => total + 1 + fil.respostes.length, 0);

function agruparPerPeli(fils, guanyadores) {
  const grups = new Map(guanyadores.map(g => [g.movieId, { ...g, fils: [] }]));
  fils.forEach(fil => {
    const clau = clauPeli(fil);
    if (!grups.has(clau)) {
      grups.set(clau, {
        movieId: clau,
        title: fil.movie?.title ?? 'Pel·lícula eliminada',
        poster: fil.movie?.poster ?? null,
        roundName: null,
        fils: [],
      });
    }
    grups.get(clau).fils.push(fil);
  });
  return [...grups.values()].filter(g => g.fils.length > 0);
}

function ordenarGrups(grups, ordenacio, mitjanes) {
  if (!ordenacio) return grups;
  const signe = ordenacio === 'mes-votades' ? -1 : 1;
  return [...grups].sort((a, b) => {
    const va = mitjanes.get(a.movieId)?.valor;
    const vb = mitjanes.get(b.movieId)?.valor;
    if (va === undefined || vb === undefined) return (va === undefined) - (vb === undefined);
    return signe * (va - vb);
  });
}

function textEliminar(comentari) {
  const respostes = comentari.respostes?.length ?? 0;
  const ambRespostes = respostes === 0 ? '' : respostes === 1 ? ' i la seva resposta' : ` i les seves ${respostes} respostes`;
  return `Segur que vols eliminar aquest comentari${ambRespostes}? Aquesta acció no es pot desfer.`;
}

export default function CommentsHistory({ fils = [], guanyadores = [], usuari = null, modeAdmin = false }) {
  const [filtrePeli, setFiltrePeli] = useState('');
  const [cerca, setCerca] = useState('');
  const [visibles, setVisibles] = useState(COMENTARIS_PER_TANDA);
  const [perMostrar, setPerMostrar] = useState(null);
  const [destacat, setDestacat] = useState(null);
  const [comentariAEliminar, setComentariAEliminar] = useState(null);
  const [ordenacio, setOrdenacio] = useState(''); // '', 'mes-votades' o 'menys-votades'
  const [desplegats, setDesplegats] = useState(new Set());
  const sentinellaRef = useRef(null);

  const mitjanes = useMemo(() => {
    const resultat = new Map();
    agruparPerPeli(fils, guanyadores).forEach(grup => {
      const valoracions = grup.fils.map(f => f.rating).filter(Boolean);
      if (valoracions.length === 0) return;
      const valor = valoracions.reduce((suma, v) => suma + v, 0) / valoracions.length;
      resultat.set(grup.movieId, { valor, mitjana: valor.toLocaleString('ca-ES', { maximumFractionDigits: 1 }), total: valoracions.length });
    });
    return resultat;
  }, [fils, guanyadores]);

  const totsElsGrups = ordenarGrups(agruparPerPeli(fils, guanyadores), ordenacio, mitjanes);

  const opcionsPelis = totsElsGrups.map(g => ({
    movieId: g.movieId,
    title: g.title,
    poster: g.poster,
    roundName: g.roundName,
    total: comptarComentaris(g.fils),
  }));
  
  const peliFiltrada = totsElsGrups.some(g => g.movieId === filtrePeli) ? filtrePeli : '';

  const grups = useMemo(() => {
    const text = cerca.trim().toLowerCase();
    const filtrats = fils.filter(fil =>
      (!peliFiltrada || clauPeli(fil) === peliFiltrada) &&
      (!text || [fil, ...fil.respostes].some(c => c.text.toLowerCase().includes(text)))
    );
    return ordenarGrups(agruparPerPeli(filtrats, guanyadores), ordenacio, mitjanes);
  }, [fils, guanyadores, peliFiltrada, cerca, ordenacio, mitjanes]);

  const ordre = useMemo(() => grups.flatMap(g => g.fils.map(f => f._id)), [grups]);
  const amagats = ordre.length - visibles;

  // Mentre la sentinella és a la pantalla, es van desplegant tandes noves
  useEffect(() => {
    const sentinella = sentinellaRef.current;
    if (amagats <= 0 || !sentinella) return;
    let timer;
    const observer = new IntersectionObserver(([entrada]) => {
      clearTimeout(timer);
      if (entrada.isIntersecting) {
        timer = setTimeout(() => setVisibles(v => v + COMENTARIS_PER_TANDA), ESPERA_TANDA_MS);
      }
    });
    observer.observe(sentinella);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [amagats]);

  useEffect(() => escoltarComentariPublicat((id) => {
    setFiltrePeli('');
    setCerca('');
    setOrdenacio('');
    setPerMostrar(id);
  }), []);

  // El comentari nou arriba amb la pàgina actualitzada: es desplega fins a ell i s'hi fa scroll
  useEffect(() => {
    if (!perMostrar) return;
    const index = ordre.indexOf(perMostrar);
    if (index === -1) return;
    if (index >= visibles) {
      setVisibles(index + 1);
      return;
    }
    document.getElementById(`comentari-${perMostrar}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setDestacat(perMostrar);
    setPerMostrar(null);
  }, [perMostrar, ordre, visibles]);

  useEffect(() => {
    if (!destacat) return;
    const timer = setTimeout(() => setDestacat(null), DURADA_DESTACAT_MS);
    return () => clearTimeout(timer);
  }, [destacat]);

  const canviarFiltrePeli = (valor) => {
    setFiltrePeli(valor);
    setVisibles(COMENTARIS_PER_TANDA);
  };

  const canviarCerca = (valor) => {
    setCerca(valor);
    setVisibles(COMENTARIS_PER_TANDA);
  };

  // En ordenar, tots els grups es pleguen; en treure l'ordenació, es tornen a desplegar
  const canviarOrdenacio = (valor) => {
    setOrdenacio(valor);
    setDesplegats(new Set());
    setVisibles(COMENTARIS_PER_TANDA);
  };

  const commutarGrup = (movieId) => {
    setDesplegats(anteriors => {
      const nous = new Set(anteriors);
      if (nous.has(movieId)) nous.delete(movieId);
      else nous.add(movieId);
      return nous;
    });
  };

  const esPlegat = (movieId) => Boolean(ordenacio) && !desplegats.has(movieId);

  // Amb ordenació es mostren tots els grups (plegats) i els desplegats amb tots els seus comentaris; sense ordenació, els comentaris es van mostrant per tandes
  let restants = ordenacio ? Infinity : visibles;
  const grupsVisibles = [];
  for (const grup of grups) {
    if (restants <= 0) break;
    const filsVisibles = esPlegat(grup.movieId) ? [] : grup.fils.slice(0, restants);
    restants -= filsVisibles.length;
    grupsVisibles.push({ ...grup, filsVisibles });
  }
  const amagatsVisibles = ordenacio ? 0 : amagats;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold border-b border-slate-800 pb-3">
        💬 <span>Crítica</span>
      </h2>

      {fils.length === 0 ? (
        <p className="text-slate-500 text-sm">Encara no hi ha cap comentari.</p>
      ) : (
        <>
          <div className="sticky z-40 top-[var(--navbar-height)] flex flex-col sm:flex-row sm:items-center gap-2 bg-slate-800/90 backdrop-blur-md p-4 border border-slate-700 rounded-b-xl shadow-lg shadow-black/60">
            <div className="w-full">
              <WinnerSelect
                opcions={opcionsPelis}
                value={peliFiltrada}
                onChange={canviarFiltrePeli}
                opcioTotes={{ title: 'Totes les pel·lícules', total: comptarComentaris(fils) }}
              />
            </div>
            {modeAdmin && (
              <div className="relative w-full sm:w-72">
                <input
                  type="text"
                  value={cerca}
                  onChange={(e) => canviarCerca(e.target.value)}
                  placeholder="Cercar pel text del comentari..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-3 pr-8 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 shadow-inner"
                />
                {cerca && (
                  <button
                    type="button"
                    onClick={() => canviarCerca('')}
                    aria-label="Netejar la cerca"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer transition text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            )}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="hidden sm:inline text-xs text-slate-400 font-medium">Ordenar:</span>
              <select
                value={ordenacio}
                onChange={(e) => canviarOrdenacio(e.target.value)}
                className="w-full sm:w-auto bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="">Més recents</option>
                <option value="mes-votades">Més valorades</option>
                <option value="menys-votades">Menys valorades</option>
              </select>
            </div>
          </div>

          {grups.length === 0 ? (
            <p className="text-slate-500 text-sm">Cap comentari coincideix amb la cerca.</p>
          ) : (
            <div className="space-y-4">
              {grupsVisibles.map(grup => (
                <div key={grup.movieId} className="bg-slate-800/40 border border-slate-700/60 rounded-2xl overflow-hidden shadow-sm">
                  <div
                    onClick={ordenacio ? () => commutarGrup(grup.movieId) : undefined}
                    className={`relative flex items-center gap-3 px-4 py-3 bg-slate-800 ${
                      esPlegat(grup.movieId) ? '' : 'border-b border-slate-700/60'
                    } ${ordenacio ? 'cursor-pointer hover:bg-slate-700/60 transition-colors' : ''}`}
                  >
                    {grup.poster ? (
                      <img src={`https://image.tmdb.org/t/p/w92${grup.poster}`} alt={grup.title} className="w-10 h-14 object-cover rounded shadow flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-14 bg-slate-700 rounded flex-shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      {grup.roundName && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-medium uppercase tracking-wide">
                          {grup.roundName}
                        </span>
                      )}
                      <h3 className="flex items-start gap-4 font-bold text-sm sm:text-base text-slate-100 mt-1">
                        <span className="min-w-0">{grup.roundName && '🏆 '}{grup.title}</span>
                        {mitjanes.has(grup.movieId) && (
                          <span className="flex flex-shrink-0 items-center gap-1">
                            <span className="text-amber-400 font-semibold">★</span>
                            <span className="text-sm text-slate-400 whitespace-nowrap">{mitjanes.get(grup.movieId).mitjana} {`(${mitjanes.get(grup.movieId).total})`}</span>
                          </span>
                        )}
                      </h3>
                    </div>
                    <span className="text-xs text-slate-400 flex-shrink-0 absolute top-4 right-4" title="Comentaris i respostes">
                      💬 {comptarComentaris(grup.fils)}
                    </span>
                    {ordenacio && (
                      <span className={`text-slate-400 text-xs flex-shrink-0 transition-transform ${esPlegat(grup.movieId) ? '' : 'rotate-180'}`}>▼</span>
                    )}
                  </div>

                  <div className="divide-y divide-slate-700/40">
                    {grup.filsVisibles.map(fil => (
                      <CommentThread
                        key={fil._id}
                        fil={fil}
                        usuari={usuari}
                        modeAdmin={modeAdmin}
                        destacat={destacat}
                        cerca={cerca}
                        onEliminar={setComentariAEliminar}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {amagatsVisibles > 0 && (
                <button
                  ref={sentinellaRef}
                  type="button"
                  onClick={() => setVisibles(v => v + COMENTARIS_PER_TANDA)}
                  className="w-full flex flex-col items-center gap-1 py-4 text-slate-400 hover:text-indigo-300 transition cursor-pointer"
                >
                  <span className="text-lg animate-bounce">▼</span>
                  <span className="text-xs">
                    {amagatsVisibles === 1 ? 'Queda 1 comentari' : `Queden ${amagatsVisibles} comentaris`} · baixa o clica per veure'n més
                  </span>
                </button>
              )}
            </div>
          )}
        </>
      )}

      {comentariAEliminar && (
        <ConfirmDeleteModal
          title="Eliminar comentari"
          onConfirm={() => eliminarComentari(comentariAEliminar._id)}
          onClose={() => setComentariAEliminar(null)}
        >
          {textEliminar(comentariAEliminar)}
        </ConfirmDeleteModal>
      )}
    </div>
  );
}
