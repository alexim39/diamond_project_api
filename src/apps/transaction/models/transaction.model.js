// models/transaction.js
import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  partnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'partner',
    required: true,
  },
  amount: Number,
  reference: String,
  status: String,
  paymentMethod: String,
  transactionType: String,
  date: {
    type: Date,
    default: Date.now,
  },
  // Other transaction details...
});

export const TransactionModel = mongoose.model('Transaction', transactionSchema);
