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
      type: {
        street: { type: String },
        city: { type: String },
        state: { type: String },
        country: { 
          type: String,
          default: 'Nigeria'
        },
      },
    },
    email: {
      type: String,
      unique: true,
      lowercase: true,
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
    role: {
      type: String,
      default: 'User'
    },
    whatsappGroupLink: {
      type: String,
    },
    whatsappChatLink: {
      type: String,
    },
    testimonial: {
      type: String,
    },
    facebookPage: {
      type: String,
    },
    linkedinPage: {
      type: String,
    },
    youtubePage: {
      type: String,
    },
    instagramPage: {
      type: String,
    },
    tiktokPage: {
      type: String,
    },
    twitterPage: {
      type: String,
    },
    followers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Partner'
    }],
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpires: {
      type: String,
    },
    subscription: {
      status: { 
        type: String, 
        required: true,
        default: 'expired'
      },//"active | cancelled | expired",
      plan: { 
        type: String, 
        required: true,
        default: 'Basic'
      },//"Basic | Premium | Business",
      nextBillingDate: { type: Date },
    },
    settings: {
      notification: {
        send: {
          type: String,
          required: true,
          default: 'email', // "email" | "sms" | "both"
          enum: ['email', 'sms', 'both', 'off']
        },
        receive: {
          type: String,
          required: true,
          default: 'email', // "email" | "sms" | "both"
          enum: ['email', 'sms', 'both', 'off']
        }
      }
    },
  },
  {
    timestamps: true
  }
);

/* Model */
export const PartnersModel = mongoose.model('Partner', partnersSchema);
