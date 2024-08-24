import mongoose from 'mongoose';

/* Schema partners */
const partnersSchema = mongoose.Schema(
  {
    username: {
      type: String,
      unique: true,
      required: [true, "Please enter response for username"]
    },
    name: {
      type: String,
      required: [true, "Please enter name"]
    },
    surname: {
      type: String,
      required: [true, "Please enter surname"]
    },
    address: {
      type: String,
    },
    email: {
      type: String,
      unique: true,
      required: [true, "Please enter email address"]
    },
    phone: {
      type: String,
      unique: true,
      required: [true, "Please enter phone number"]
    },
    reservationCode: {
      type: String,
      unique: true,
      required: [true, "Please enter reservation code"]
    },
    password: {
      type: String,
      required: [true, "Please enter password"]
    },
    tnc: {
      type: Boolean,
      default: false
    },
    status: {
      type: Boolean,
      default: false
    },
    bio: {
      type: String,
    },
    partnerOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Partner',
    },  
    visits: {
      type: Number,
      default: 0
    }, 
    dobDatePicker: {
      type: Date
    },
    balance: {
      type: Number,
      default: 0,
    },
    profileImage: {
      type: String,
    },
    jobTitle: {
      type: String,
    },
    educationBackground: {
      type: String,
    },
    hobby: {
      type: String,
    },
    skill: {
      type: String,
    },
    followers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Partner'
    }],
  },
  {
    timestamps: true
  }
);

/* Model */
export const PartnersModel = mongoose.model('Partner', partnersSchema);
