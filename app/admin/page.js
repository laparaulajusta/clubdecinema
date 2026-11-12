import { connectDB } from '@/lib/mongodb';
import { MESOS, ANYS, ZONA_HORARIA } from '@/lib/constants';
import { getNumPelisVotacio, getMaxPropostesSetmana, setNumPelisVotacio, setMaxPropostesSetmana, getRondaActual } from '@/lib/settings';
import { getFilsComentaris, llistarGuanyadores } from '@/lib/comments';
import Movie from '@/models/Movie';
import Tag from '@/models/Tag';
import History from '@/models/History';
import Setting from '@/models/Setting';
import User from '@/models/User';
import Vote from '@/models/Vote';
import Comment from '@/models/Comment';
import Session from '@/models/Session';
import mongoose from 'mongoose';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getUsuariActual, requireAdmin } from '@/lib/auth';
import AdminRepository from '@/components/AdminRepository';
import LiveSearch from '@/components/LiveSearch';
import Navbar from '@/components/Navbar';
import VotingControls from '@/components/VotingControls';
import VotesSummary from '@/components/VotesSummary';
import TagManager from '@/components/TagManager';
import ConfiguracioJoc from '@/components/ConfiguracioJoc';
import UsersAdmin from '@/components/UsersAdmin';
import CommentsHistory from '@/components/CommentsHistory';

export const dynamic = 'force-dynamic';

async function assignarGuanyadora() {
  const active = await Movie.find({ en_votacio: true }).lean();
  const maxVotes = Math.max(0, ...active.map(m => m.votes));

  await Movie.updateMany({ en_votacio: true }, { $set: { guanyadora: false } });
  if (maxVotes > 0) {
    await Movie.findOneAndUpdate(
      { en_votacio: true, votes: maxVotes },
      { $set: { guanyadora: true } }
    );
  }
}

export default async function AdminPage() {
  const usuari = await getUsuariActual();
  if (!usuari?.isAdmin) redirect('/');

  await connectDB();
  const rawTags = await Tag.find().lean();
  const tags = rawTags.map(t => ({ _id: t._id.toString(), name: t.name })).sort((a, b) => a.name.localeCompare(b.name));
  const tagsMap = new Map(tags.map(t => [t._id, t]));
  const tagsNameMap = new Map(tags.map(t => [t.name, t]));

  const rawMovies = await Movie.find().populate({ path: 'addedBy', model: User, select: 'name username' }).lean();
  const movies = rawMovies.map(m => {
    let resolvedTag = null;
    if (m.tag) {
      const tagStr = m.tag.toString();
      if (tagsMap.has(tagStr)) resolvedTag = tagsMap.get(tagStr);
      else if (tagsNameMap.has(tagStr)) resolvedTag = tagsNameMap.get(tagStr);
      else resolvedTag = { _id: tagStr, name: tagStr };
    }
    const addedBy = m.addedBy ? { name: m.addedBy.name, username: m.addedBy.username } : null;
    return { ...m, _id: m._id.toString(), tag: resolvedTag, addedBy };
  });

  const activeMoviesCount = movies.filter(m => m.en_votacio).length;
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
        poster: movie.poster
      };
    }
  });

  const historyWithDetails = historyRecords.map(record => ({
    ...record,
    movies: record.movies.map(m => ({
      ...m,
      movieId: movieMap[String(m.tmdbId)]?._id || null,
      title: movieMap[String(m.tmdbId)]?.title || `Pel·lícula no trobada (ID: ${m.tmdbId})`,
      poster: movieMap[String(m.tmdbId)]?.poster || null
    }))
  }));

  const setting = await Setting.findOne({ key: 'voting_closed' });
  const votingClosed = setting ? setting.value : false;

  const numPelisVotacio = await getNumPelisVotacio();
  const maxPropostesSetmana = await getMaxPropostesSetmana();

  const rondaActual = await getRondaActual();
  const rondesArxivades = new Map(historyRecords.filter(r => r.round).map(r => [r.round, r]));
  const rawVotes = await Vote.find()
    .sort({ createdAt: -1 })
    .populate({ path: 'user', model: User, select: 'name username' })
    .populate({ path: 'movie', model: Movie, select: 'title poster tmdbId guanyadora' })
    .lean();

  const votantsPerPeli = new Map();
  rawVotes
    .filter(v => v.round === rondaActual && v.user && v.movie)
    .forEach(v => {
      const movieId = v.movie._id.toString();
      if (!votantsPerPeli.has(movieId)) votantsPerPeli.set(movieId, []);
      votantsPerPeli.get(movieId).push({ name: v.user.name, username: v.user.username });
    });

  const resumVots = movies
    .filter(m => m.en_votacio)
    .sort((a, b) => b.votes - a.votes || a.title.localeCompare(b.title))
    .map(m => ({
      _id: m._id,
      title: m.title,
      poster: m.poster,
      votes: m.votes,
      guanyadora: votingClosed && m.guanyadora === true,
      votants: votantsPerPeli.get(m._id) ?? []
    }));

  const esVotGuanyador = (vot) => {
    const arxivada = rondesArxivades.get(vot.round);
    if (arxivada) return arxivada.movies.some(m => m.guanyadora && String(m.tmdbId) === String(vot.movie?.tmdbId));
    return vot.round === rondaActual && votingClosed && vot.movie?.guanyadora === true;
  };

  const votsPerUsuari = new Map();
  rawVotes.forEach(v => {
    if (!v.user) return;
    const userId = v.user._id.toString();
    if (!votsPerUsuari.has(userId)) votsPerUsuari.set(userId, []);
    votsPerUsuari.get(userId).push({
      _id: v._id.toString(),
      ronda: rondesArxivades.get(v.round)?.roundName ?? (v.round === rondaActual ? 'Ronda actual' : 'Ronda sense arxivar'),
      title: v.movie?.title ?? 'Pel·lícula eliminada',
      poster: v.movie?.poster ?? null,
      guanyadora: esVotGuanyador(v)
    });
  });

  const rawUsers = await User.find().lean();
  const usuaris = rawUsers
    .map(u => ({
      _id: u._id.toString(),
      username: u.username,
      name: u.name,
      isAdmin: u.isAdmin === true,
      alta: new Date(u.createdAt).toLocaleDateString('ca-ES', { timeZone: ZONA_HORARIA }),
      vots: votsPerUsuari.get(u._id.toString()) ?? []
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const guanyadoraActual = votingClosed ? movies.find(m => m.en_votacio && m.guanyadora) : null;
  const guanyadores = llistarGuanyadores(historyWithDetails, guanyadoraActual);
  const filsComentaris = await getFilsComentaris(usuari);

  async function desarConfiguracio(formData) {
    'use server'
    await requireAdmin();
    const numPelisActual = await getNumPelisVotacio();
    const numPelis = formData.has('num_pelis_votacio') ? Number(formData.get('num_pelis_votacio')) : numPelisActual;
    const maxPropostes = Number(formData.get('max_propostes_setmana'));

    if (!Number.isInteger(numPelis) || numPelis < 1 || !Number.isInteger(maxPropostes) || maxPropostes < 1) {
      return { success: false, message: 'Els valors han de ser nombres enters més grans que 0.' };
    }

    if (numPelis !== numPelisActual && (await Movie.countDocuments({ en_votacio: true })) > 0) {
      return { success: false, message: 'No es pot canviar el nombre de pel·lícules per votació mentre hi hagi pel·lícules en votació.' };
    }

    await setNumPelisVotacio(numPelis);
    await setMaxPropostesSetmana(maxPropostes);

    revalidatePath('/admin');
    revalidatePath('/');
    return { success: true, message: 'Configuració desada.' };
  }

  async function canviarTag(formData) {
    'use server'
    await requireAdmin();
    const id = formData.get('id');
    const tagId = formData.get('tagId');
    await connectDB();
    await Movie.findByIdAndUpdate(id, { tag: tagId });
    revalidatePath('/admin');
    revalidatePath('/');
  }

  async function toggleVotacio(formData) {
    'use server'
    await requireAdmin();
    const id = formData.get('id');
    await connectDB();
    const movie = await Movie.findById(id);
    if (!movie) return;

    if (!movie.en_votacio) {
      const count = await Movie.countDocuments({ en_votacio: true });
      if (count >= (await getNumPelisVotacio())) return;
    }

    movie.en_votacio = !movie.en_votacio;
    movie.votes = 0;
    await movie.save();
    // Els vots se li posen a 0: qui l'havia votat aquesta ronda pot tornar a votar
    await Vote.deleteMany({ round: await getRondaActual(), movie: id });
    revalidatePath('/admin');
    revalidatePath('/');
  }

  async function eliminarPeli(formData) {
    'use server'
    await requireAdmin();
    const id = formData.get('id');
    await connectDB();
    await Movie.findByIdAndDelete(id);
    await Vote.deleteMany({ round: await getRondaActual(), movie: id });
    revalidatePath('/admin');
    revalidatePath('/');
  }

  async function editarPeli(formData) {
    'use server'
    await requireAdmin();
    const id = formData.get('id');
    const title = String(formData.get('title') ?? '').trim();
    const overview = String(formData.get('overview') ?? '').trim();

    if (!title) {
      return { success: false, error: 'El títol no pot quedar buit.' };
    }

    const filtre = { _id: id };
    const canvis = { title, overview };
    const editaVots = formData.has('votes');

    if (editaVots) {
      const votes = Number(formData.get('votes'));
      if (!Number.isInteger(votes) || votes < 0) {
        return { success: false, error: 'Els vots han de ser un nombre enter igual o més gran que 0.' };
      }
      
      // Només es desen si la peli continua en votació i ningú ha votat mentre s'editava
      filtre.en_votacio = true;
      filtre.votes = Number(formData.get('votesOriginals'));
      canvis.votes = votes;
    }

    await connectDB();
    const updated = await Movie.findOneAndUpdate(filtre, canvis);

    if (!updated) {
      const actual = await Movie.findById(id).lean();
      if (!actual) {
        return { success: false, error: "No s'ha trobat la pel·lícula." };
      }
      revalidatePath('/admin');
      if (!actual.en_votacio) {
        return { success: false, error: "Aquesta pel·lícula ja no és en votació, així que no se n'han pogut desar els vots." };
      }
      return { success: false, error: `Els vots han canviat mentre editaves (ara en té ${actual.votes}). Tanca i torna a obrir l'edició.` };
    }

    if (editaVots) {
      const setting = await Setting.findOne({ key: 'voting_closed' });
      if (setting?.value) await assignarGuanyadora();
    }

    revalidatePath('/admin');
    revalidatePath('/');
    return { success: true };
  }

  async function afegirTag(formData) {
    'use server'
    await requireAdmin();
    const name = formData.get('name');
    if (!name) return;
    await connectDB();
    await Tag.create({ name });
    revalidatePath('/admin');
    revalidatePath('/');
  }

  async function eliminarTag(formData) {
    'use server'
    await requireAdmin();
    const id = formData.get('id');
    await connectDB();
    await Tag.findByIdAndDelete(id);
    revalidatePath('/admin');
    revalidatePath('/');
  }

  async function tancarRonda() {
    'use server'
    await requireAdmin();
    await connectDB();

    if ((await Movie.countDocuments({ en_votacio: true })) === 0) {
      return { success: false, message: 'No hi ha pel·lícules en votació per poder tancar-la.' };
    }

    await assignarGuanyadora();
    await Setting.findOneAndUpdate({ key: 'voting_closed' }, { value: true }, { upsert: true });

    revalidatePath('/admin');
    revalidatePath('/');
    return { success: true, message: 'Votació tancada correctament i pel·lícula guanyadora assignada!' };
  }

  async function reobrirRonda() {
    'use server'
    await requireAdmin();
    await connectDB();

    await Movie.updateMany({ en_votacio: true }, { $set: { guanyadora: false } });
    await Setting.findOneAndUpdate({ key: 'voting_closed' }, { value: false }, { upsert: true });

    revalidatePath('/admin');
    revalidatePath('/');
    return { success: true, message: 'Votació reoberta correctament. Els usuaris ja poden tornar a votar.' };
  }

  async function resetejarVotacio(formData) {
    'use server'
    await requireAdmin();
    const mes = formData.get('mes');
    const any = formData.get('any');
    const roundName = `${mes} ${any}`;

    await connectDB();

    const active = await Movie.find({ en_votacio: true }).lean();
    const numPelis = await getNumPelisVotacio();
    if (active.length !== numPelis) {
      return { success: false, message: `Cal tenir exactament ${numPelis} pel·lícules en votació per guardar l'històric.` };
    }

    const existent = await History.findOne({ roundName });
    if (existent) {
      return { success: false, message: `Ja existeix un històric registrat per a ${roundName}.` };
    }

    const maxVotes = Math.max(...active.map(m => m.votes));

    await Movie.updateMany({ en_votacio: true }, { $set: { guanyadora: false } });
    if (maxVotes > 0) {
      await Movie.findOneAndUpdate(
        { en_votacio: true, votes: maxVotes },
        { $set: { guanyadora: true } }
      );
    }

    await History.create({
      roundName,
      round: await getRondaActual(),
      movies: active.map(m => ({
        tmdbId: m.tmdbId,
        votes: m.votes,
        guanyadora: m.votes > 0 && m.votes === maxVotes
      }))
    });
    
    await Movie.updateMany({ en_votacio: true }, { $set: { en_votacio: false, votes: 0 } });
    await Setting.findOneAndUpdate({ key: 'voting_closed' }, { value: false }, { upsert: true });
    // Ronda nova: els vots que es facin a partir d'ara ja no es barregen amb els de la ronda arxivada
    await Setting.findOneAndUpdate({ key: 'voting_round' }, { value: Date.now().toString() }, { upsert: true });

    revalidatePath('/admin');
    revalidatePath('/');
    return { success: true, message: `Històric de ${roundName} desat i votació resetejada amb èxit!` };
  }

  async function afegirDesDeAdmin(formData) {
    'use server'
    const admin = await requireAdmin();
    const tmdbId = Number(formData.get('tmdbId'));
    const title = formData.get('title');
    const poster = formData.get('poster');
    const overview = formData.get('overview');
    const release_date = formData.get('release_date') || '';
    let tagId = formData.get('tagId');

    await connectDB();
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
      addedBy: admin._id
    });

    revalidatePath('/admin');
    revalidatePath('/');
    return { success: true };
  }

  async function canviarAdmin(formData) {
    'use server'
    const admin = await requireAdmin();
    const id = formData.get('id');
    if (!mongoose.isValidObjectId(id)) return { success: false, error: 'Usuari no vàlid.' };
    if (id === admin._id) return { success: false, error: 'No et pots treure els permisos a tu mateix.' };

    await connectDB();
    await User.updateOne({ _id: id }, { isAdmin: formData.get('isAdmin') === 'true' });
    revalidatePath('/admin');
    return { success: true };
  }

  async function eliminarUsuari(formData) {
    'use server'
    const admin = await requireAdmin();
    const id = formData.get('id');
    if (!mongoose.isValidObjectId(id)) return { success: false, error: 'Usuari no vàlid.' };
    if (id === admin._id) return { success: false, error: 'No et pots eliminar a tu mateix.' };

    await connectDB();
    const votRondaActual = await Vote.findOne({ user: id, round: await getRondaActual() }).lean();
    if (votRondaActual) {
      await Movie.updateOne({ _id: votRondaActual.movie, en_votacio: true, votes: { $gt: 0 } }, { $inc: { votes: -1 } });
      const tancada = await Setting.findOne({ key: 'voting_closed' });
      if (tancada?.value) await assignarGuanyadora();
    }

    const comentaris = await Comment.find({ user: id }).select('_id').lean();
    await Comment.deleteMany({ $or: [{ user: id }, { parent: { $in: comentaris.map(c => c._id) } }] });
    await Vote.deleteMany({ user: id });
    await Session.deleteMany({ user: id });
    await User.deleteOne({ _id: id });

    revalidatePath('/admin');
    revalidatePath('/');
    return { success: true };
  }

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100">
      <Navbar page={"admin"} usuari={usuari} />
      <div className="max-w-7xl mx-auto p-6 md:p-12 space-y-12">
        
        <header className="text-center space-y-2 pt-4">
          <h1 className="text-4xl font-extrabold tracking-tight text-white">Panell d'administració</h1>
          <p className="text-slate-400">Gestiona les pel·lícules, categories i votacions</p>
        </header>

        <ConfiguracioJoc
          numPelisVotacio={numPelisVotacio}
          maxPropostesSetmana={maxPropostesSetmana}
          pelisEnVotacio={activeMoviesCount}
          desarConfiguracio={desarConfiguracio}
        />

        <section id="admin-afegir" className="space-y-6 scroll-mt-24">
          <h2 className="text-2xl font-bold border-b border-slate-800 pb-3">
            🎞️ <span>Afegir pel·lícules i categories</span>
          </h2> 

          <div className="flex flex-col gap-6">
            <div className="bg-slate-800 border border-slate-700 p-5 rounded-xl shadow-lg flex flex-col">
              <h4 className="text-sm font-bold text-slate-200 mb-4">Cercador TMDB per afegir pel·lícules al repositori</h4>
              <div className="flex-1">
                <LiveSearch onAddMovie={afegirDesDeAdmin} tags={tags} existingMovies={movies} />
              </div>
            </div>

            <TagManager tags={tags} afegirTag={afegirTag} eliminarTag={eliminarTag} />
          </div>
        </section>

        <section id="admin-active" className="space-y-6 scroll-mt-24">
          <VotingControls
            activeMoviesCount={activeMoviesCount}
            numPelisVotacio={numPelisVotacio}
            votingClosed={votingClosed}
            mesos={MESOS}
            anys={ANYS}
            tancarRonda={tancarRonda}
            reobrirRonda={reobrirRonda}
            resetejarVotacio={resetejarVotacio}
          />
          <VotesSummary pelis={resumVots} />
        </section>

        <section id="admin-repo" className="scroll-mt-24">
          <AdminRepository 
            movies={movies} 
            tags={tags} 
            activeMoviesCount={activeMoviesCount} 
            toggleVotacio={toggleVotacio} 
            eliminarPeli={eliminarPeli}
            editarPeli={editarPeli}
            canviarTag={canviarTag}
            historyRecords={historyWithDetails}
            numPelisVotacio={numPelisVotacio}
          />
        </section>

        <section id="admin-usuaris" className="scroll-mt-24">
          <UsersAdmin
            usuaris={usuaris}
            usuariActualId={usuari._id}
            canviarAdmin={canviarAdmin}
            eliminarUsuari={eliminarUsuari}
          />
        </section>

        <section id="admin-history" className="space-y-6 scroll-mt-24">
          <h2 className="text-2xl font-bold border-b border-slate-800 pb-3">
            🕒 <span>Històric de votacions</span>
          </h2>

          {historyRecords.length === 0 ? (
            <p className="text-slate-500 text-sm">Encara no hi ha rondes registrades.</p>
          ) : (
            <div className="space-y-4">
              {historyWithDetails.map((record) => (
                <details key={record._id} className="bg-slate-800 border border-slate-700/80 rounded-xl p-5 shadow-lg group">
                  <summary className="flex justify-between items-center cursor-pointer list-none">
                    <h3 className="font-bold text-lg text-indigo-300">{record.roundName}</h3>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-slate-400">{new Date(record.createdAt).toLocaleDateString()}</span>
                      <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                    </div>
                  </summary>
                  
                  <div className="pt-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-2 border-t border-slate-700/50">
                    {record.movies.map((m, idx) => (
                      <a 
                        key={idx} 
                        href={`https://www.themoviedb.org/movie/${m.tmdbId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`relative bg-slate-900 border rounded-xl p-3 flex gap-3 items-center ${m.guanyadora ? 'border-amber-500/50' : 'border-slate-700/50'} transition cursor-pointer group`}
                      >
                        <span className="absolute top-3 right-3 text-[10px]">↗</span>       
                        {m.poster ? (
                          <img src={`https://image.tmdb.org/t/p/w92${m.poster}`} alt={m.title} className="w-10 h-14 object-cover rounded shadow" />
                        ) : <div className="w-10 h-14 bg-slate-800 rounded" />}
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs truncate text-slate-200">{m.title}</h4>
                          <p className="text-[10px] text-emerald-400 mt-0.5">⭐ {m.votes} vots</p>
                          {m.guanyadora && <p className="text-[10px] font-bold text-amber-400 mt-0.5">🏆 Guanyadora</p>}
                        </div>       
                      </a>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          )}
        </section>

        <section id="admin-comentaris" className="scroll-mt-24 min-h-[calc(100vh-4.5rem)]">
          <CommentsHistory fils={filsComentaris} guanyadores={guanyadores} usuari={usuari} modeAdmin />
        </section>

      </div>
    </main>
  );
}