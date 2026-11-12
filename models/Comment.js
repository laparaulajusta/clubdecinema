import mongoose from 'mongoose';

const CommentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  movie: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie', required: true },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null }, // respostes: un sol nivell
  text: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now },
  editedAt: { type: Date }
});

export default mongoose.models.Comment || mongoose.model('Comment', CommentSchema);
