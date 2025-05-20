import mongoose from 'mongoose';

export const CommunicationSchema = new mongoose.Schema(
    {
    
    date: {
        type: Date,
        required: true,
        default: Date.now,
    },
    type: {
        type: String,
        enum: ['call', 'email', 'text', 'zoom', 'whatsapp'],
        required: true,
    },
    duration: {
        type: Number,
        // Only applicable for 'call' and 'zoom'
        min: 0,
        default: 0,
    },
    description: {
        type: String,
        required: true,
    },
    followUpAction: {
        type: String,
        default: 'To be determined',
    },
    topicsDiscussed: {
        type: [String],
        default: [],
    },
    documentsShared: {
        type: [String],
        default: [],
    },
    interestLevel: {
        type: String,
        enum: ['hot', 'warm', 'cold'],
        default: 'warm',
    },
    status: {
        type: String,
        default: 'Open', 
        // Closed - When not needed anymore!
    }

  },
  {
    timestamps: true,
  }
);
