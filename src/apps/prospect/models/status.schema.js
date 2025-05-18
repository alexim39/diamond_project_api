import mongoose from 'mongoose';

export const StatusSchema = new mongoose.Schema(
    {
    
    name: { type: String, default: 'New Prospect' }, // Main status string
    note: { type: String },                          // Optional context from user input
    paydayDate: { type: Date },                      // For "Waiting for Pay Day"
    expectedDecisionDate: { type: Date },            // For "Promised to Join", "Thinking About It"
    onboardingDate: { type: Date },                  // For "Booked for Onboarding"
  },
  {
    timestamps: true,
  }
);
