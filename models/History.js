import mongoose from 'mongoose';

if (mongoose.models.History) {
  delete mongoose.models.History;
}

const HistorySchema = new mongoose.Schema({
  roundName: { type: String, required: true },
  round: { type: String }, // valor de 'voting_round' de la ronda arxivada, per enllaçar-hi els Vote
  movies: [{
    tmdbId: { type: Number, required: true },
    votes: { type: Number, default: 0 },
    guanyadora: { type: Boolean, default: false }
  }],
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.History || mongoose.model('History', HistorySchema);