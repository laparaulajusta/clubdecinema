// Comunicació entre components client que no comparteixen arbre (p. ex. obrir el modal del Navbar des d'un formulari)
const OBRIR_LOGIN = 'club:obrir-login';
const COMENTARI_PUBLICAT = 'club:comentari-publicat';

export const obrirModalLogin = (motiu = '') => window.dispatchEvent(new CustomEvent(OBRIR_LOGIN, { detail: motiu }));
export const avisarComentariPublicat = (id) => window.dispatchEvent(new CustomEvent(COMENTARI_PUBLICAT, { detail: id }));

const escoltar = (nom, callback) => {
  const handler = (e) => callback(e.detail);
  window.addEventListener(nom, handler);
  return () => window.removeEventListener(nom, handler);
};

export const escoltarObrirModalLogin = (callback) => escoltar(OBRIR_LOGIN, callback);
export const escoltarComentariPublicat = (callback) => escoltar(COMENTARI_PUBLICAT, callback);
