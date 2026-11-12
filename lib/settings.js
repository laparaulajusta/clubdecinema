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
