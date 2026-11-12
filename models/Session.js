import mongoose from 'mongoose';
import { DURADA_SESSIO_SEGONS } from '@/lib/constants';

const SessionSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now, expires: DURADA_SESSIO_SEGONS }
});

export default mongoose.models.Session || mongoose.model('Session', SessionSchema);
