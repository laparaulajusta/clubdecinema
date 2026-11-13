import { connectDB } from '@/lib/mongodb';
import Setting from '@/models/Setting';

async function llegirEnterPositiu(key, perDefecte) {
  await connectDB();
  const setting = await Setting.findOne({ key }).lean();
  const valor = Number(setting?.value);
  return Number.isInteger(valor) && valor > 0 ? valor : perDefecte;
}

async function desarValor(key, value) {
  await connectDB();
  await Setting.findOneAndUpdate({ key }, { value }, { upsert: true });
}

export const getNumPelisVotacio = () => llegirEnterPositiu('num_pelis_votacio', 5);
export const getMaxPropostesSetmana = () => llegirEnterPositiu('max_propostes_setmana', 5);

export const setNumPelisVotacio = (valor) => desarValor('num_pelis_votacio', valor);
export const setMaxPropostesSetmana = (valor) => desarValor('max_propostes_setmana', valor);

export async function getDriveUri() {
  await connectDB();
  const setting = await Setting.findOne({ key: 'drive_uri' }).lean();
  return typeof setting?.value === 'string' ? setting.value : '';
}

export const setDriveUri = (valor) => desarValor('drive_uri', valor);

// Identificador de la ronda en curs (es crea si encara no existeix); es desa a cada Vote i a l'History en arxivar
export async function getRondaActual() {
  await connectDB();
  const ronda = await Setting.findOneAndUpdate(
    { key: 'voting_round' },
    { $setOnInsert: { value: Date.now().toString() } },
    { upsert: true, returnDocument: 'after' }
  ).lean();
  return String(ronda.value);
}
