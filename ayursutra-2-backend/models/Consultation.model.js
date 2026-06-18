import mongoose from 'mongoose';

const consultationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  practitioner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  symptoms: [{
    type: String,
    required: true
  }],
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  doshaAnalysis: {
    primaryDosha: {
      type: String,
      enum: ['vata', 'pitta', 'kapha', 'mixed']
    },
    imbalance: {
      type: String,
      enum: ['vata', 'pitta', 'kapha', 'balanced']
    }
  },
  recommendations: {
    diet: [String],
    lifestyle: [String],
    herbs: [String],
    yoga: [String],
    meditation: [String]
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  appointmentDate: {
    type: Date
  },
  notes: {
    type: String
  },
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  feedback: {
    type: String
  }
}, {
  timestamps: true
});

const Consultation = mongoose.model('Consultation', consultationSchema);

export default Consultation;
