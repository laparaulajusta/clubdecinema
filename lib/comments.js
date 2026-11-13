import { connectDB } from '@/lib/mongodb';
import { MINUTS_EDICIO_COMENTARI, ZONA_HORARIA } from '@/lib/constants';
import Comment from '@/models/Comment';
import Movie from '@/models/Movie';
import User from '@/models/User';

const formatarData = (data) => new Date(data).toLocaleString('ca-ES', { dateStyle: 'medium', timeStyle: 'short', timeZone: ZONA_HORARIA });

// De la més recent a la més antiga; la de la ronda tancada que encara no s'ha arxivat va primer
export function llistarGuanyadores(historyWithDetails, guanyadoraActual) {
  const guanyadores = [];
  const afegir = (movieId, title, poster, roundName) => {
    if (movieId && !guanyadores.some(g => g.movieId === movieId)) {
      guanyadores.push({ movieId, title, poster: poster || null, roundName });
    }
  };

  if (guanyadoraActual) afegir(guanyadoraActual._id, guanyadoraActual.title, guanyadoraActual.poster, 'Ronda actual');
  historyWithDetails.forEach(record => {
    const winner = record.movies.find(m => m.guanyadora) || record.movies[0];
    if (winner) afegir(winner.movieId, winner.title, winner.poster, record.roundName);
  });
  return guanyadores;
}

export async function getFilsComentaris(usuari) {
  await connectDB();
  const rawComments = await Comment.find()
    .sort({ createdAt: -1 })
    .populate({ path: 'user', model: User, select: 'name username' })
    .populate({ path: 'movie', model: Movie, select: 'title poster' })
    .lean();

  const iniciTempsEdicio = Date.now() - MINUTS_EDICIO_COMENTARI * 60 * 1000;
  const formatar = (c) => ({
    _id: c._id.toString(),
    text: c.text,
    data: formatarData(c.createdAt),
    editat: Boolean(c.editedAt),
    rating: c.rating ?? null,
    user: c.user ? { name: c.user.name, username: c.user.username } : null,
    editable: Boolean(usuari) && c.user?._id.toString() === usuari._id && new Date(c.createdAt).getTime() > iniciTempsEdicio,
  });

  const fils = rawComments
    .filter(c => !c.parent)
    .map(c => ({
      ...formatar(c),
      movie: c.movie ? { _id: c.movie._id.toString(), title: c.movie.title, poster: c.movie.poster || null } : null,
      respostes: [],
    }));

  // Les respostes van en ordre cronològic, com una conversa
  const filsPerId = new Map(fils.map(f => [f._id, f]));
  rawComments
    .filter(c => c.parent)
    .reverse()
    .forEach(c => filsPerId.get(c.parent.toString())?.respostes.push(formatar(c)));

  return fils;
}
