import mongoose from 'mongoose';

const ayurvedaContentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  content: {
    type: String,
    required: [true, 'Content is required']
  },
  category: {
    type: String,
    enum: ['dosha', 'diet', 'lifestyle', 'herbs', 'yoga', 'meditation', 'general'],
    required: true
  },
  dosha: {
    type: String,
    enum: ['vata', 'pitta', 'kapha', 'all', null],
    default: null
  },
  tags: [String],
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  featured: {
    type: Boolean,
    default: false
  },
  views: {
    type: Number,
    default: 0
  },
  imageUrl: String,
  videoUrl: String
}, {
  timestamps: true
});

const AyurvedaContent = mongoose.model('AyurvedaContent', ayurvedaContentSchema);

export default AyurvedaContent;
