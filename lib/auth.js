import { cache } from 'react';
import { cookies } from 'next/headers';
import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import { COOKIE_SESSIO, DURADA_SESSIO_SEGONS } from '@/lib/constants';
import User from '@/models/User';
import Session from '@/models/Session';

// A la base de dades només es guarda el hash del token; el token només viu a la cookie
const hashToken = (token) => createHash('sha256').update(token).digest('hex');

export const hashContrasenya = (contrasenya) => bcrypt.hash(contrasenya, 10);
export const comprovarContrasenya = (contrasenya, hash) => bcrypt.compare(contrasenya, hash);

export const crearSessio = async (userId) => {
  const token = randomBytes(32).toString('base64url');
  await connectDB();
  await Session.create({ token: hashToken(token), user: userId });

  (await cookies()).set(COOKIE_SESSIO, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: DURADA_SESSIO_SEGONS,
  });
};

export const tancarSessioActual = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_SESSIO)?.value;
  if (token) {
    await connectDB();
    await Session.deleteOne({ token: hashToken(token) });
  }
  cookieStore.delete(COOKIE_SESSIO);
};

export const tancarAltresSessions = async (userId) => {
  const token = (await cookies()).get(COOKIE_SESSIO)?.value;
  await connectDB();
  await Session.deleteMany({ user: userId, token: { $ne: token ? hashToken(token) : null } });
};

export const getUsuariActual = cache(async () => {
  const token = (await cookies()).get(COOKIE_SESSIO)?.value;
  if (!token) return null;

  await connectDB();
  const sessio = await Session.findOne({ token: hashToken(token) })
    .populate({ path: 'user', model: User, select: 'username name isAdmin' })
    .lean();
  if (!sessio?.user) return null;

  const { _id, username, name, isAdmin } = sessio.user;
  return { _id: _id.toString(), username, name, isAdmin: isAdmin === true };
});

export const requireAdmin = async () => {
  const usuari = await getUsuariActual();
  if (!usuari?.isAdmin) throw new Error('No autoritzat');
  return usuari;
};
