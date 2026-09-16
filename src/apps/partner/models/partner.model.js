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
    // Derived calendar parts for indexed birthday lookup (R6 follow-up).
    // Maintained by schema hooks below + one-shot backfill — never set directly.
    dobMonth: {
      type: Number, min: 1, max: 12,
    },
    dobDay: {
      type: Number, min: 1, max: 31,
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
    // Admin suspension — set only via PATCH /v1/admin/partners/:id/suspend.
    // Suspended partners fail signin and session checks; existing JWTs die
    // at expiry (24h) at the latest.
    suspendedAt: {
      type: Date,
      default: null,
    },
    suspendReason: {
      type: String,
      default: null,
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

/**
 * Pure calendar-part extraction (server-local month/day — the same basis
 * the birthday job queries on). Exported for the job, the backfill and tests.
 * @returns {{dobMonth: number|null, dobDay: number|null}}
 */
export const dobParts = (dob) => {
  if (dob === undefined || dob === null || (typeof dob === 'string' && dob.trim() === '')) {
    return { dobMonth: null, dobDay: null };
  }
  const d = dob instanceof Date ? dob : new Date(dob);
  if (Number.isNaN(d.getTime())) return { dobMonth: null, dobDay: null };
  return { dobMonth: d.getMonth() + 1, dobDay: d.getDate() };
};

/** Document-save path (create + .save()). Testable without Mongo. */
export const applyDobSave = (doc) => {
  if (typeof doc.isModified === 'function' && !doc.isModified('dobDatePicker')) return false;
  const { dobMonth, dobDay } = dobParts(doc.dobDatePicker);
  doc.dobMonth = dobMonth ?? undefined;
  doc.dobDay = dobDay ?? undefined;
  return true;
};

/**
 * Query-update path (findOneAndUpdate / findByIdAndUpdate — the only live
 * writer is legacy updateProfile). Handles `$set` and top-level shapes.
 * Absent key (incl. explicit `undefined`, which Mongoose strips) leaves
 * derived fields alone; null/invalid clears them.
 */
export const applyDobUpdate = (update) => {
  if (!update || typeof update !== 'object') return false;
  const set = update.$set && typeof update.$set === 'object' ? update.$set : null;
  const raw = set && 'dobDatePicker' in set
    ? set.dobDatePicker
    : ('dobDatePicker' in update ? update.dobDatePicker : undefined);
  if (raw === undefined) return false;
  const target = set ?? update;
  const { dobMonth, dobDay } = dobParts(raw);
  if (dobMonth == null) {
    delete target.dobMonth;
    delete target.dobDay;
    const unset = update.$unset && typeof update.$unset === 'object' ? update.$unset : {};
    update.$unset = { ...unset, dobMonth: 1, dobDay: 1 };
  } else {
    target.dobMonth = dobMonth;
    target.dobDay = dobDay;
    if (update.$unset && typeof update.$unset === 'object') {
      delete update.$unset.dobMonth;
      delete update.$unset.dobDay;
    }
  }
  return true;
};

partnersSchema.pre('save', function () { applyDobSave(this); });
partnersSchema.pre('findOneAndUpdate', function () { applyDobUpdate(this.getUpdate() ?? {}); });

/* Model */
export const PartnersModel = mongoose.models.Partner ?? mongoose.model('Partner', partnersSchema);
