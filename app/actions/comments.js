'use server'

import { revalidatePath } from 'next/cache';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { getUsuariActual } from '@/lib/auth';
import { MAX_CARACTERS_COMENTARI, MINUTS_EDICIO_COMENTARI } from '@/lib/constants';
import Comment from '@/models/Comment';
import Movie from '@/models/Movie';

const SENSE_SESSIO = { success: false, error: "Has d'iniciar sessió per comentar." };
const FORA_DE_TEMPS = { success: false, error: `Només pots modificar els teus comentaris durant els ${MINUTS_EDICIO_COMENTARI} minuts posteriors a publicar-los.` };

const llegirText = (formData) => String(formData.get('text') ?? '').trim();

const validarText = (text) => {
  if (!text) return 'El comentari no pot quedar buit.';
  if (text.length > MAX_CARACTERS_COMENTARI) return `El comentari no pot superar els ${MAX_CARACTERS_COMENTARI} caràcters.`;
  return null;
};

const iniciTempsEdicio = () => new Date(Date.now() - MINUTS_EDICIO_COMENTARI * 60 * 1000);

const revalidarComentaris = () => {
  revalidatePath('/');
  revalidatePath('/admin');
};

export async function afegirComentari(formData) {
  const autor = await getUsuariActual();
  if (!autor) return SENSE_SESSIO;

  const text = llegirText(formData);
  const error = validarText(text);
  if (error) return { success: false, error };

  await connectDB();
  const parentId = formData.get('parentId') || null;
  let movieId = formData.get('movieId');

  if (parentId) {
    const pare = mongoose.isValidObjectId(parentId) ? await Comment.findById(parentId).lean() : null;
    if (!pare || pare.parent) {
      return { success: false, error: "No s'ha trobat el comentari que vols respondre." };
    }
    movieId = pare.movie;
  } else if (!mongoose.isValidObjectId(movieId) || !(await Movie.exists({ _id: movieId }))) {
    return { success: false, error: 'Selecciona una pel·lícula vàlida.' };
  }

  const rating = parentId ? 0 : Number(formData.get('rating') ?? 0);
  if (!Number.isInteger(rating) || rating < 0 || rating > 10) {
    return { success: false, error: 'La valoració ha de ser un nombre del 0 al 10.' };
  }

  const comentari = await Comment.create({
    user: autor._id,
    movie: movieId,
    parent: parentId,
    text,
    ...(rating > 0 && { rating })
  });
  revalidarComentaris();
  return { success: true, id: comentari._id.toString() };
}

export async function editarComentari(formData) {
  const usuari = await getUsuariActual();
  if (!usuari) return SENSE_SESSIO;

  const id = formData.get('id');
  const text = llegirText(formData);
  const error = validarText(text);
  if (error) return { success: false, error };
  if (!mongoose.isValidObjectId(id)) return FORA_DE_TEMPS;

  await connectDB();
  const editat = await Comment.findOneAndUpdate(
    { _id: id, user: usuari._id, createdAt: { $gt: iniciTempsEdicio() } },
    { text, editedAt: new Date() }
  );
  if (!editat) return FORA_DE_TEMPS;

  revalidarComentaris();
  return { success: true };
}

// L'autor el pot eliminar durant el temps d'edició; un admin, sempre. Les respostes s'eliminen amb el comentari.
export async function eliminarComentari(id) {
  const usuari = await getUsuariActual();
  if (!usuari) return SENSE_SESSIO;
  if (!mongoose.isValidObjectId(id)) return FORA_DE_TEMPS;

  await connectDB();
  const filtre = usuari.isAdmin
    ? { _id: id }
    : { _id: id, user: usuari._id, createdAt: { $gt: iniciTempsEdicio() } };
  const eliminat = await Comment.findOneAndDelete(filtre);
  if (!eliminat) return FORA_DE_TEMPS;

  await Comment.deleteMany({ parent: id });
  revalidarComentaris();
  return { success: true };
}
