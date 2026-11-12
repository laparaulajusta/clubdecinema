'use server'

import { revalidatePath } from 'next/cache';
import { connectDB } from '@/lib/mongodb';
import { crearSessio, tancarSessioActual, tancarAltresSessions, hashContrasenya, comprovarContrasenya, getUsuariActual } from '@/lib/auth';
import { MIN_CARACTERS_CONTRASENYA, MAX_CARACTERS_NOM } from '@/lib/constants';
import User from '@/models/User';

const FORMAT_USUARI = /^[a-z0-9._-]{3,20}$/;
const SESSIO_CADUCADA = { success: false, error: 'La sessió ha caducat. Torna a iniciar sessió.' };

function validarNom(name) {
  return !name || name.length > MAX_CARACTERS_NOM ? `Escriu el teu nom (màxim ${MAX_CARACTERS_NOM} caràcters).` : null;
}

function validarContrasenya(password) {
  if (password.length < MIN_CARACTERS_CONTRASENYA) {
    return `La contrasenya ha de tenir com a mínim ${MIN_CARACTERS_CONTRASENYA} caràcters.`;
  }
  // bcrypt només té en compte els primers 72 bytes
  if (Buffer.byteLength(password) > 72) return 'La contrasenya és massa llarga.';
  return null;
}

export async function iniciarSessio(formData) {
  const username = String(formData.get('username') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');

  if (!username || !password) {
    return { success: false, error: "Escriu l'usuari i la contrasenya." };
  }

  await connectDB();
  const user = await User.findOne({ username }).lean();
  if (!user || !(await comprovarContrasenya(password, user.password))) {
    return { success: false, error: 'Usuari o contrasenya incorrectes.' };
  }

  await crearSessio(user._id);
  revalidatePath('/', 'layout');
  return { success: true };
}

export async function registrarUsuari(formData) {
  const username = String(formData.get('username') ?? '').trim().toLowerCase();
  const name = String(formData.get('name') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!FORMAT_USUARI.test(username)) {
    return { success: false, error: "L'usuari ha de tenir entre 3 i 20 caràcters: lletres sense accents, números, punts, guions o guions baixos." };
  }
  const error = validarNom(name) || validarContrasenya(password);
  if (error) return { success: false, error };

  await connectDB();
  if (await User.exists({ username })) {
    return { success: false, error: "Aquest nom d'usuari ja està agafat." };
  }

  let user;
  try {
    user = await User.create({ username, name, password: await hashContrasenya(password) });
  } catch (err) {
    if (err?.code === 11000) {
      return { success: false, error: "Aquest nom d'usuari ja està agafat." };
    }
    throw err;
  }

  await crearSessio(user._id);
  revalidatePath('/', 'layout');
  return { success: true };
}

export async function canviarNom(formData) {
  const usuari = await getUsuariActual();
  if (!usuari) return SESSIO_CADUCADA;

  const name = String(formData.get('name') ?? '').trim();
  const error = validarNom(name);
  if (error) return { success: false, error };

  await connectDB();
  await User.updateOne({ _id: usuari._id }, { name });
  revalidatePath('/', 'layout');
  return { success: true };
}

export async function canviarContrasenya(formData) {
  const usuari = await getUsuariActual();
  if (!usuari) return SESSIO_CADUCADA;

  const actual = String(formData.get('actual') ?? '');
  const nova = String(formData.get('nova') ?? '');
  const error = validarContrasenya(nova);
  if (error) return { success: false, error };

  await connectDB();
  const user = await User.findById(usuari._id).lean();
  if (!user || !(await comprovarContrasenya(actual, user.password))) {
    return { success: false, error: 'La contrasenya actual no és correcta.' };
  }

  await User.updateOne({ _id: usuari._id }, { password: await hashContrasenya(nova) });
  await tancarAltresSessions(usuari._id);
  return { success: true };
}

export async function tancarSessio() {
  await tancarSessioActual();
  revalidatePath('/', 'layout');
}
