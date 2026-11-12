import mongoose from 'mongoose';

const VoteSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  round: { type: String, required: true }, // valor del setting 'voting_round' de la ronda votada
  movie: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie', required: true },
  createdAt: { type: Date, default: Date.now }
});

VoteSchema.index({ user: 1, round: 1 }, { unique: true });

export default mongoose.models.Vote || mongoose.model('Vote', VoteSchema);
