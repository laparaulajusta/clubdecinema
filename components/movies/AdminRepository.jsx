'use client';
import { useState, useTransition, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal';

function CategoriaSelect({ tags, defaultValue }) {
  const { pending } = useFormStatus();

  return (
    <>
      <select
        name="tagId"
        defaultValue={defaultValue}
        disabled={pending}
        onChange={(e) => e.target.form.requestSubmit()}
        className={`bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 flex-1 ${pending ? 'opacity-60 cursor-wait' : 'cursor-pointer'}`}
      >
        {tags.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
      </select>
      {pending && <span className="w-3 h-3 border-2 border-indigo-300 border-t-transparent rounded-full animate-spin flex-shrink-0" />}
    </>
  );
}

function ToggleVotacioButton({ enVotacio, votes, limitAssolit, compact = false }) {
  const { pending } = useFormStatus();
  const bloquejat = !enVotacio && limitAssolit;
  const accio = enVotacio
    ? 'Treure de votació' + (votes > 0 ? ` (${votes})` : '')
    : 'Posar en votació';
  const colors = pending
    ? 'bg-slate-600 text-slate-300 cursor-wait'
    : enVotacio
    ? 'bg-amber-600 hover:bg-amber-500 text-white cursor-pointer'
    : bloquejat
    ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
    : 'bg-slate-700 hover:bg-slate-600 text-white cursor-pointer';
  const spinner = <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />;

  if (compact) {
    return (
      <button
        type="submit"
        disabled={pending || bloquejat}
        title={bloquejat ? 'Ja hi ha el màxim de pel·lícules en votació' : accio}
        aria-label={accio}
        className={`w-7 h-7 rounded-lg text-base font-bold leading-none transition flex items-center justify-center ${colors}`}
      >
        {pending ? spinner : enVotacio ? '−' : '+'}
      </button>
    );
  }

  return (
    <button
      type="submit"
      disabled={pending || bloquejat}
      className={`w-full py-1.5 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 ${colors}`}
    >
      {pending && spinner}
      {pending ? 'Processant...' : accio}
    </button>
  );
}

function EditMovieModal({ movie, editarPeli, onClose }) {
  const votesOriginals = movie.votes ?? 0;
  const [title, setTitle] = useState(movie.title || '');
  const [overview, setOverview] = useState(movie.overview || '');
  const [votes, setVotes] = useState(String(votesOriginals));
  const [error, setError] = useState('');
  const [isSaving, startSaving] = useTransition();

  const votesNum = votes.trim() === '' ? NaN : Number(votes);
  const votesCanviats = movie.en_votacio && votesNum !== votesOriginals;
  const senseCanvis = title.trim() === (movie.title || '').trim() && overview.trim() === (movie.overview || '').trim() && !votesCanviats;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('El títol no pot quedar buit.');
      return;
    }
    if (votesCanviats && (!Number.isInteger(votesNum) || votesNum < 0)) {
      setError('Els vots han de ser un nombre enter igual o més gran que 0.');
      return;
    }
    const formData = new FormData();
    formData.append('id', movie._id);
    formData.append('title', title);
    formData.append('overview', overview);
    if (votesCanviats) {
      formData.append('votes', String(votesNum));
      formData.append('votesOriginals', String(votesOriginals));
    }
    setError('');
    startSaving(async () => {
      try {
        const res = await editarPeli(formData);
        if (res?.success) onClose();
        else setError(res?.error || "No s'han pogut desar els canvis.");
      } catch {
        setError("S'ha produït un error inesperat.");
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <form onSubmit={handleSubmit} className="bg-slate-800 border border-slate-600 rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl space-y-4">
        <h3 className="text-slate-200 font-semibold text-base">Editar pel·lícula</h3>

        <label className="block space-y-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Títol</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isSaving}
            autoFocus
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sinopsi</span>
          <textarea
            value={overview}
            onChange={(e) => setOverview(e.target.value)}
            disabled={isSaving}
            rows={8}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 leading-relaxed focus:outline-none focus:border-indigo-500 resize-y disabled:opacity-60"
          />
        </label>

        {movie.en_votacio && (
          <label className="block space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Vots de la ronda actual</span>
            <input
              type="number"
              min={0}
              step={1}
              required
              value={votes}
              onChange={(e) => setVotes(e.target.value)}
              disabled={isSaving}
              className="block w-28 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
            />
          </label>
        )}

        {error && (
          <div className="p-3 rounded-xl text-xs font-medium border bg-rose-500/10 border-rose-500/30 text-rose-300">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 border border-slate-600 hover:bg-slate-700 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel·lar
          </button>
          <button
            type="submit"
            disabled={isSaving || senseCanvis}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              isSaving
                ? 'bg-slate-600 text-slate-300 cursor-wait'
                : senseCanvis
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer'
            }`}
          >
            {isSaving && <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {isSaving ? 'Desant...' : 'Desar canvis'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function AdminRepository({ movies, tags, activeMoviesCount, toggleVotacio, eliminarPeli, editarPeli, canviarTag, historyRecords = [], numPelisVotacio }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [filterWinner, setFilterWinner] = useState('all');
  const [sortBy, setSortBy] = useState('title');
  const [viewMode, setViewMode] = useState('normal'); // 'normal' o 'compact'
  const [movieToDelete, setMovieToDelete] = useState(null);
  const [movieToEdit, setMovieToEdit] = useState(null);
  const [expandedIds, setExpandedIds] = useState({});

  const toggleExpanded = (id) => setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));

  const sectionRef = useRef(null);
  const scrollToSectionTop = () => {
    if (!sectionRef.current) return;
    
    const element = sectionRef.current;
    const rect = element.getBoundingClientRect();
    
    const computedStyles = getComputedStyle(element);
    const scrollMarginPx = parseFloat(computedStyles.scrollMarginTop) || 0;
    
    if (rect.top < scrollMarginPx) {
      element.scrollIntoView({ behavior: 'instant', block: 'start' });
    }
  };

  const movieVotesMap = {};
  const movieElectionsMap = {};
  const winningTmdbIds = new Set();
  historyRecords.forEach(record => {
    record.movies.forEach(m => {
      movieVotesMap[m.tmdbId] = (movieVotesMap[m.tmdbId] || 0) + (m.votes || 0);
      movieElectionsMap[m.tmdbId] = (movieElectionsMap[m.tmdbId] || 0) + 1;
      if (m.guanyadora) winningTmdbIds.add(m.tmdbId);
    });
  });

  const filteredMovies = movies.filter(movie => {
    const matchSearch = movie.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchTag = filterTag ? (movie.tag?._id === filterTag || movie.tag === filterTag) : true;
    const guanyadora = winningTmdbIds.has(movie.tmdbId);
    const matchWinner = filterWinner === 'all' ? true : filterWinner === 'winner' ? guanyadora : !guanyadora;
    return matchSearch && matchTag && matchWinner;
  });

  const groupedMovies = {};
  tags.forEach(t => {
    groupedMovies[t.name] = [];
  });
  groupedMovies['Sense Categoria'] = [];

  filteredMovies.forEach(movie => {
    const tagName = movie.tag?.name || 'Sense Categoria';
    if (!groupedMovies[tagName]) groupedMovies[tagName] = [];
    groupedMovies[tagName].push(movie);
  });

  const compararPelis = (a, b) => {
    const votesA = movieVotesMap[a.tmdbId] || 0;
    const votesB = movieVotesMap[b.tmdbId] || 0;
    const electionsA = movieElectionsMap[a.tmdbId] || 0;
    const electionsB = movieElectionsMap[b.tmdbId] || 0;

    if (sortBy === 'title') {
      return a.title.localeCompare(b.title);
    } else if (sortBy === 'votes-desc') {
      if (votesB !== votesA) return votesB - votesA;
      return a.title.localeCompare(b.title);
    } else if (sortBy === 'votes-asc') {
      if (votesA !== votesB) return votesA - votesB;
      return a.title.localeCompare(b.title);
    } else if (sortBy === 'elections-desc') {
      if (electionsB !== electionsA) return electionsB - electionsA;
      return a.title.localeCompare(b.title);
    } else if (sortBy === 'elections-asc') {
      if (electionsA !== electionsB) return electionsA - electionsB;
      return a.title.localeCompare(b.title);
    }

    return a.title.localeCompare(b.title);
  };

  Object.keys(groupedMovies).forEach(tagName => groupedMovies[tagName].sort(compararPelis));
  const sortedMovies = [...filteredMovies].sort(compararPelis);

  const infoPeli = (movie) => ({
    accumulatedVotes: movieVotesMap[movie.tmdbId] || 0,
    guanyadora: winningTmdbIds.has(movie.tmdbId),
    numVotacions: historyRecords.filter(record => record.movies.some(m => m.tmdbId === movie.tmdbId)).length,
    anyPeli: movie.release_date ? new Date(movie.release_date).getFullYear() : (movie.year || ''),
  });

  const renderListItem = (movie) => {
    const { accumulatedVotes, guanyadora, numVotacions, anyPeli } = infoPeli(movie);

    return (
      <div key={movie._id} className="bg-slate-800 border border-slate-700 rounded-lg p-2 flex items-center gap-3 shadow-sm transition has-[a:hover]:border-indigo-500">
        <a
          href={`https://www.themoviedb.org/movie/${movie.tmdbId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-3 flex-1 min-w-0 group/peli"
        >
          {movie.poster ? (
            <img src={`https://image.tmdb.org/t/p/w92${movie.poster}`} alt={movie.title} className="w-8 h-8 object-cover rounded-lg shadow-md flex-shrink-0" />
          ) : (
            <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center text-[9px] text-slate-400 flex-shrink-0 shadow-md">Sense imatge</div>
          )}
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-2 overflow-hidden">
              <h4 className="font-bold text-[11px] text-slate-100 truncate group-hover/peli:text-indigo-300 transition" title={movie.title}>{movie.title}</h4>
              {anyPeli && <span className="text-[10px] text-slate-400 flex-shrink-0">{anyPeli}</span>}
              <div className="ms-auto flex gap-2 text-[10px]">
                {movie.en_votacio && movie.votes > 0 && (
                  <span title="Vots de la ronda actual" className="text-slate-400">({movie.votes})</span>
                )}
                <span>↗</span>
              </div>
            </div>
            <div className="flex items-end gap-2 mt-0.5">
              {movie.tag?.name && <span className="text-[9px] text-slate-500 truncate">{movie.tag.name}</span>}
              <div className="flex items-center ms-auto gap-1">
                {numVotacions > 0 && <span title="Vegades que ha estat proposada en votació" className="inline-block text-[9px] bg-emerald-500/10 text-emerald-300 px-0.5 py-0 rounded font-medium">🗳️ {numVotacions}</span>}
                {guanyadora && <span title="Guanyadora" className="inline-block text-[9px] bg-amber-500/10 text-amber-300 px-0.5 py-0 rounded font-medium">🏆</span>}
                {accumulatedVotes > 0 && <span title="Total de vots acumulats" className="text-[9px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 px-0.5 py-0 rounded font-medium">⭐ {accumulatedVotes}</span>}
              </div>
            </div>
          </div>
        </a>
       
        <form action={toggleVotacio}>
          <input type="hidden" name="id" value={movie._id} />
          <ToggleVotacioButton
            enVotacio={movie.en_votacio}
            votes={movie.votes}
            limitAssolit={activeMoviesCount >= numPelisVotacio}
            compact
          />
        </form>
      </div>
    );
  };

  const eliminarPelicula = () => {
    const formData = new FormData();
    formData.append('id', movieToDelete._id);
    return eliminarPeli(formData);
  };

  return (
    <div ref={sectionRef} className="space-y-6 scroll-mt-[calc(var(--navbar-height)+0.5rem)]">
      <h2 className="text-2xl font-bold text-slate-100 border-b border-slate-800 pb-3">
        ⚙️ <span>Gestió del repositori i les votacions</span>
      </h2>

      <div className="sticky z-40 top-[var(--navbar-height)] flex flex-wrap gap-1 sm:gap-2 justify-center items-center bg-slate-800/90 backdrop-blur-md p-4 border border-slate-700 rounded-b-xl shadow-lg shadow-black/60">
        <div className="relative flex-auto">
          <input 
            type="text" 
            placeholder="Cercar pel·lícula..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); scrollToSectionTop(); }}
            className="h-8 px-3 w-full text-[10px] sm:text-xs bg-slate-900 border border-slate-700 rounded-xl text-[10px] sm:text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
          />
          {searchTerm && (
            <button 
              type="button" 
              onClick={() => setSearchTerm('')} 
              className="absolute right-2.5 top-2 text-slate-400 hover:text-white cursor-pointer transition text-xs"
            >
              ✕
            </button>
          )}
        </div>

        <select 
          value={filterTag} 
          onChange={(e) => { setFilterTag(e.target.value); scrollToSectionTop(); }}
          className="h-8 px-3 bg-slate-900 border border-slate-700 rounded-xl text-[10px] sm:text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
        >
          <option value="">Totes les categories</option>
          {tags.map(tag => <option key={tag._id} value={tag._id}>{tag.name}</option>)}
        </select>

        <select 
          value={filterWinner} 
          onChange={(e) => { setFilterWinner(e.target.value); scrollToSectionTop(); }}
          className="h-8 px-3 bg-slate-900 border border-slate-700 rounded-xl text-[10px] sm:text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
        >
          <option value="all">Totes</option>
          <option value="winner">🏆 Guanyadores</option>
          <option value="nowinner">No guanyadores</option>
        </select>

        <div className="flex h-8 bg-slate-900 border border-slate-700 rounded-xl p-1">
          <button
            type="button"
            onClick={() => { setViewMode('normal'); scrollToSectionTop(); }}
            className={`px-3 text-[10px] sm:text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              viewMode === 'normal' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            ☷ Graella
          </button>
          <button
            type="button"
            onClick={() => { setViewMode('compact'); scrollToSectionTop(); }}
            className={`px-3 text-[10px] sm:text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              viewMode === 'compact' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            ☰ Llista
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-xs text-slate-400 font-medium">Ordenar:</span>
          <select 
            value={sortBy} 
            onChange={(e) => { setSortBy(e.target.value); scrollToSectionTop(); }}
            className="h-8 px-3 bg-slate-900 border border-slate-700 rounded-xl text-[10px] sm:text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="title">Alfabètic (A-Z)</option>
            <option value="votes-desc">Més vots</option>
            <option value="votes-asc">Menys vots</option>
            <option value="elections-desc">Més votacions</option>
            <option value="elections-asc">Menys votacions</option>
          </select>
        </div>
      </div>

      <div className="space-y-6">
        {viewMode === 'compact' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1">
            {sortedMovies.map(renderListItem)}
          </div>
        ) : Object.entries(groupedMovies).map(([tagName, moviesList]) => {
          if (moviesList.length === 0) return null;
          return (
            <details open key={tagName} className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-5 group">
              <summary className="font-bold text-sm text-slate-300 uppercase tracking-wider cursor-pointer list-none flex justify-between items-center">
                <span>{tagName} <span className="text-indigo-400 normal-case font-medium ml-2">({moviesList.length})</span></span>
                <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-700/50">
                {moviesList.map(movie => {
                  const { accumulatedVotes, guanyadora, numVotacions, anyPeli } = infoPeli(movie);

                  return (
                    <div key={movie._id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col justify-between gap-3 shadow-md">
                      <div className="flex gap-3 items-start">
                        {movie.poster ? (
                          <img src={`https://image.tmdb.org/t/p/w92${movie.poster}`} alt={movie.title} className="w-14 h-20 object-cover rounded shadow flex-shrink-0" />
                        ) : (
                          <div className="w-14 h-20 bg-slate-700 rounded flex items-center justify-center text-[9px] text-slate-400 flex-shrink-0">Sense imatge</div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex justify-between items-start gap-1">
                            <h4 className="font-bold text-wrap text-sm text-slate-100" title={movie.title}>{movie.title}</h4>
                            <a 
                              href={`https://www.themoviedb.org/movie/${movie.tmdbId}`} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-[10px] text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/30 flex-shrink-0"
                              title="Veure a TMDB"
                            >
                              TMDB ↗
                            </a>
                          </div>
                          {anyPeli && <p className="text-[11px] text-slate-400 mt-0.5">{anyPeli}</p>}
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p title="Total de vots acumulats" className="text-[11px] text-emerald-400 mt-0.5 font-medium">⭐ {accumulatedVotes} vots</p>
                            {numVotacions > 0 && <span title="Vegades que ha estat proposada en votació" className="inline-block mt-1 text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-medium">🗳️ {numVotacions}</span>}
                            {guanyadora && <span title="Guanyadora" className="inline-block mt-1 text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-medium">🏆</span>}                          
                          </div>
                          <span
                            type="button"
                            onClick={() => toggleExpanded(movie._id)}
                            className="w-full text-[10px] text-indigo-300 hover:text-indigo-400 cursor-pointer pt-1"
                          >
                            {expandedIds[movie._id] ? '▲ Amagar sinopsi' : '▼ Veure sinopsi'}
                          </span>
                          {expandedIds[movie._id] && (
                            <p className="text-[10px] text-slate-300 leading-relaxed pt-2 text-justify">
                              {movie.overview || "Sense sinopsi disponible per aquesta pel·lícula."}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 pt-2 border-t border-slate-700/50">
                        {movie.addedBy && (
                          <p className="-mb-1 text-[10px] text-slate-500" title={`@${movie.addedBy.username}`}>
                            Afegida per {movie.addedBy.name}
                          </p>
                        )}
                        <form action={canviarTag} className="flex gap-2 items-center">
                          <input type="hidden" name="id" value={movie._id} />
                          <CategoriaSelect tags={tags} defaultValue={movie.tag?._id || ''} />
                        </form>

                        <div className="flex gap-2">
                          <form action={toggleVotacio} className="flex-1">
                            <input type="hidden" name="id" value={movie._id} />
                            <ToggleVotacioButton
                              enVotacio={movie.en_votacio}
                              votes={movie.votes}
                              limitAssolit={activeMoviesCount >= numPelisVotacio}
                            />
                          </form>

                          <button
                            type="button"
                            onClick={() => setMovieToEdit(movie)}
                            className="bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                            title="Editar títol i sinopsi"
                          >
                            ✏️
                          </button>

                          <button
                            type="button"
                            onClick={() => setMovieToDelete(movie)}
                            className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                            title="Eliminar pel·lícula"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </details>
          );
        })}
        {filteredMovies.length === 0 && (
          <p className="col-span-full text-center text-slate-400 py-8">No s'ha trobat cap pel·lícula.</p>
        )}
      </div>

      {movieToEdit && (
        <EditMovieModal
          key={movieToEdit._id}
          movie={movieToEdit}
          editarPeli={editarPeli}
          onClose={() => setMovieToEdit(null)}
        />
      )}

      {/* Modal alerta eliminar */}
      {movieToDelete && (
        <ConfirmDeleteModal
          title="Eliminar pel·lícula"
          onConfirm={eliminarPelicula}
          onClose={() => setMovieToDelete(null)}
        >
          Segur que vols eliminar <span className="text-slate-200 font-medium">{movieToDelete.title}</span>? Aquesta acció no es pot desfer.
        </ConfirmDeleteModal>
      )}
    </div>
  );
}