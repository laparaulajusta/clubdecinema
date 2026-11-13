import { connectDB } from '@/lib/mongodb';
import { getNumPelisVotacio, getMaxPropostesSetmana, getRondaActual, getDriveUri } from '@/lib/settings';
import { getUsuariActual } from '@/lib/auth';
import { getFilsComentaris, llistarGuanyadores } from '@/lib/comments';
import Movie from '@/models/Movie';
import Tag from '@/models/Tag';
import History from '@/models/History';
import Setting from '@/models/Setting';
import Vote from '@/models/Vote';
import { revalidatePath } from 'next/cache';
import mongoose from 'mongoose';
import Navbar from '@/components/layout/Navbar';
import LiveSearch from '@/components/movies/LiveSearch';
import HomeRepository from '@/components/movies/HomeRepository';
import ActiveMoviesList from '@/components/votes/ActiveMoviesList';
import WinnerComment from '@/components/comments/WinnerComment';
import CommentsHistory from '@/components/comments/CommentsHistory';

const SETMANA_MS = 7 * 24 * 60 * 60 * 1000;

const sumarVot = (movieId) => Movie.updateOne({ _id: movieId }, { $inc: { votes: 1 } });

const restarVot = (movieId) => Movie.updateOne({ _id: movieId, votes: { $gt: 0 } }, { $inc: { votes: -1 } });

export default async function Home() {
  await connectDB();
  const rawTags = await Tag.find().lean();
  const tags = rawTags.map(t => ({ _id: t._id.toString(), name: t.name })).sort((a, b) => a.name.localeCompare(b.name));
  const tagsMap = new Map(tags.map(t => [t._id, t]));
  const tagsNameMap = new Map(tags.map(t => [t.name, t]));

  // Comprovar si les votacions estan tancades per l'administrador
  const setting = await Setting.findOne({ key: 'voting_closed' });
  const votingClosed = setting ? setting.value : false;

  const rawActiveMovies = await Movie.find({ en_votacio: true }).lean();
  
  const activeMovies = rawActiveMovies.map(m => {
    let resolvedTag = null;
    if (m.tag) {
      const tagStr = m.tag.toString();
      if (tagsMap.has(tagStr)) resolvedTag = tagsMap.get(tagStr);
      else if (tagsNameMap.has(tagStr)) resolvedTag = tagsNameMap.get(tagStr);
      else resolvedTag = { _id: tagStr, name: tagStr };
    }
    return { ...m, _id: m._id.toString(), tag: resolvedTag, addedBy: m.addedBy?.toString() ?? null };
  });

  const usuari = await getUsuariActual();
  const elMeuVot = usuari ? await Vote.findOne({ user: usuari._id, round: await getRondaActual() }).lean() : null;
  const votedMovieId = elMeuVot && activeMovies.some(m => m._id === elMeuVot.movie.toString()) ? elMeuVot.movie.toString() : null;

  const isVotingReady = activeMovies.length === (await getNumPelisVotacio());

  const rawRepoMovies = await Movie.find().lean();
  const repoMovies = rawRepoMovies.map(m => {
    let resolvedTag = null;
    if (m.tag) {
      const tagStr = m.tag.toString();
      if (tagsMap.has(tagStr)) resolvedTag = tagsMap.get(tagStr);
      else if (tagsNameMap.has(tagStr)) resolvedTag = tagsNameMap.get(tagStr);
      else resolvedTag = { _id: tagStr, name: tagStr };
    }
    return { ...m, _id: m._id.toString(), tag: resolvedTag, addedBy: m.addedBy?.toString() ?? null };
  });

  const historyRecords = JSON.parse(
      JSON.stringify(await History.find().sort({ createdAt: -1 }).lean())
    );
  
  const rawIds = [];
  historyRecords.forEach(record => {
    record.movies.forEach(m => {
      if (m.tmdbId !== undefined && m.tmdbId !== null) {
        rawIds.push(m.tmdbId);
      }
    });
  });

  const allTmdbIds = [...new Set(rawIds.flatMap(id => [id, String(id), Number(id)]))];
  const moviesData = await Movie.find({ tmdbId: { $in: allTmdbIds } }).lean();

  const movieMap = {};
  moviesData.forEach(movie => {
    if (movie.tmdbId !== undefined && movie.tmdbId !== null) {
      movieMap[String(movie.tmdbId)] = {
        _id: movie._id.toString(),
        title: movie.title,
        poster: movie.poster,
        release_date: movie.release_date
      };
    }
  });

  const historyWithDetails = historyRecords.map(record => ({
    ...record,
    movies: record.movies.map(m => ({
      ...m,
      movieId: movieMap[String(m.tmdbId)]?._id || null,
      title: movieMap[String(m.tmdbId)]?.title || `Pel·lícula no trobada (ID: ${m.tmdbId})`,
      poster: movieMap[String(m.tmdbId)]?.poster || null,
      release_date: movieMap[String(m.tmdbId)]?.release_date || null
    }))
  }));

  const guanyadores = llistarGuanyadores(historyWithDetails, votingClosed ? activeMovies.find(m => m.guanyadora) : null);
  const filsComentaris = await getFilsComentaris(usuari);
  const driveUri = await getDriveUri();

  async function votar(formData) {
    'use server'
    const votant = await getUsuariActual();
    if (!votant) return;

    await connectDB();

    // Si la votació està tancada, no permetre votar ni canviar vots
    const settingCheck = await Setting.findOne({ key: 'voting_closed' });
    if (settingCheck && settingCheck.value) return;

    const activeCheck = await Movie.countDocuments({ en_votacio: true });
    if (activeCheck < (await getNumPelisVotacio())) return;

    const newId = formData.get('id');
    if (!mongoose.isValidObjectId(newId) || !(await Movie.exists({ _id: newId, en_votacio: true }))) return;

    const ronda = await getRondaActual();
    const votAnterior = await Vote.findOne({ user: votant._id, round: ronda }).lean();
    const oldVotedId = votAnterior?.movie.toString();

    if (oldVotedId === newId) {
      // Si torna a clicar la mateixa, es retira el vot (unvote)
      const retirat = await Vote.deleteOne({ _id: votAnterior._id });
      if (retirat.deletedCount) await restarVot(newId);
    } else if (votAnterior) {
      // Canvi de vot: el filtre per la peli antiga evita comptar dues vegades un doble clic
      const canviat = await Vote.updateOne({ _id: votAnterior._id, movie: votAnterior.movie }, { movie: newId });
      if (canviat.modifiedCount) {
        await restarVot(oldVotedId);
        await sumarVot(newId);
      }
    } else {
      try {
        await Vote.create({ user: votant._id, round: ronda, movie: newId });
        await sumarVot(newId);
      } catch (err) {
        if (err?.code !== 11000) throw err; // doble clic: el primer vot ja s'ha desat
      }
    }

    revalidatePath('/');
  }

  async function afegirDesDeUsuari(formData) {
    'use server'
    const proposant = await getUsuariActual();
    if (!proposant) {
      return { success: false, error: "Has d'iniciar sessió per proposar pel·lícules." };
    }

    await connectDB();

    // El límit setmanal es compta per usuari; els admins no en tenen, com ja passa al panell
    if (!proposant.isAdmin) {
      const maxPropostes = await getMaxPropostesSetmana();
      const propostesRecents = await Movie.countDocuments({
        addedBy: proposant._id,
        createdAt: { $gte: new Date(Date.now() - SETMANA_MS) }
      });
      if (propostesRecents >= maxPropostes) {
        return { success: false, error: `Has arribat al límit de ${maxPropostes} pel·lícules afegides aquesta setmana. Torna-ho a provar més endavant.` };
      }
    }

    const tmdbId = Number(formData.get('tmdbId'));
    const title = formData.get('title');
    const poster = formData.get('poster');
    const overview = formData.get('overview');
    const release_date = formData.get('release_date') || '';
    let tagId = formData.get('tagId');

    const existent = await Movie.findOne({ tmdbId });
    if (existent) {
      return { success: false, error: 'Aquesta pel·lícula ja existeix al repositori!' };
    }

    await Movie.create({
      tmdbId,
      title,
      poster,
      overview,
      release_date,
      tag: tagId,
      en_votacio: false,
      votes: 0,
      addedBy: proposant._id
    });

    revalidatePath('/');
    revalidatePath('/admin');
    return { success: true };
  }

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100">
      <Navbar usuari={usuari} driveUri={driveUri} />
      <div className="max-w-7xl mx-auto p-6 md:p-12 space-y-12">
        
        <header className="text-center space-y-2 pt-4">
          <h1 className="text-4xl font-extrabold tracking-tight text-white">Votacions i propostes</h1>
          <p className="text-slate-400">Vota la pel·lícula que vols veure aquest mes i proposa'n de noves</p>
        </header>

        <section id="search-section" className="bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700 space-y-3 scroll-mt-24">
          <h3 className="text-sm font-semibold text-slate-300">Proposa una pel·lícula nova</h3>
          <LiveSearch onAddMovie={afegirDesDeUsuari} tags={tags} existingMovies={[...activeMovies, ...repoMovies]} requereixLogin={!usuari} />
        </section>

        <section id="comment-form-section" className="bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700 space-y-3 scroll-mt-24">
          <h3 className="text-sm font-semibold text-slate-300">Comenta la pel·lícula guanyadora</h3>
          <WinnerComment guanyadores={guanyadores} usuari={usuari} />
        </section>

        <section id="active-section" className="space-y-6 scroll-mt-24">
          <ActiveMoviesList
            activeMovies={activeMovies}
            isVotingReady={isVotingReady}
            votedMovieId={votedMovieId}
            votar={votar}
            votingClosed={votingClosed}
            requereixLogin={!usuari}
            driveUri={driveUri}
          />
        </section>

        <section id="repo-section" className="scroll-mt-24">
          <HomeRepository movies={repoMovies} tags={tags} historyRecords={historyWithDetails} />
        </section>

        <section id="history-section" className="space-y-6 scroll-mt-24">
          <h2 className="text-2xl font-bold border-b border-slate-800 pb-3">
            🕒 <span>Històric de guanyadores</span>
          </h2>
          {historyRecords.length === 0 ? (
            <p className="text-slate-500 text-sm">Encara no hi ha registres a l'històric.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {historyWithDetails.map((record) => {
                const winner = record.movies.find(m => m.guanyadora) || record.movies[0];
                const anyPeli = winner.release_date ? new Date(winner.release_date).getFullYear() : (winner.year || '');
                return (
                  <a 
                    key={record._id} 
                    href={`https://www.themoviedb.org/movie/${winner.tmdbId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 flex gap-4 items-start shadow-sm hover:border-indigo-500 hover:bg-slate-750 hover:shadow-indigo-500/10 hover:shadow-lg transition cursor-pointer group"                    
                  >
                    {winner?.poster ? (
                      <img src={`https://image.tmdb.org/t/p/w92${winner.poster}`} alt={winner.title} className="w-14 h-20 object-cover rounded-lg shadow" />
                    ) : <div className="w-14 h-20 bg-slate-700 rounded-lg" />}
                    <div className="flex-auto">
                      <div className="flex justify-between items-start">
                        <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-medium">{record.roundName}</span>
                        <span className="text-[10px]">↗</span>
                      </div>
                      <h4 className="font-bold text-sm mt-1 group-hover:text-indigo-300 transition">{winner?.title} {anyPeli && <span className="text-xs text-slate-400 mt-1">({anyPeli})</span>}</h4>                     
                      <p className="text-xs text-slate-400 mt-1">⭐ {winner?.votes} vots</p>
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </section>

        {/* Alçada mínima perquè, en ser l'última secció, el navbar la pugui marcar com a activa */}
        <section id="comments-section" className="scroll-mt-24 min-h-[calc(100vh-4.5rem)]">
          <CommentsHistory fils={filsComentaris} guanyadores={guanyadores} usuari={usuari} />
        </section>

      </div>
    </main>
  );
}