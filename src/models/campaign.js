import mongoose from 'mongoose';

/* Campaign schema*/
const campaignSchema = mongoose.Schema({
  targetAudience: {
    ageRangeTarget: { type: String, default: 'All' },
    genderTarget: { type: String, default: 'All' },
    locationTarget: { type: String, default: 'States' }, // Can be 'States', 'Cities', or 'Countries' (adjust as needed)
    educationTarget: { type: String, default: 'All' },
    relationshipTarget: { type: String, default: 'All' },
  },
  marketingObjectives: {
    adObjective: { type: String, required: true }, // Validation for required field
    successMeasurement: { type: String, required: true }, // Validation for required field
  },
  budget: {
    budgetType: { type: String, required: true }, // Validation for required field
    budgetAmount: { type: Number, required: true }, // Validation for required field
  },
  adDuration: {
    campaignStartDate: { type: Date, required: true }, // Validation for required field
    noEndDate: { type: Boolean, required: true }, // Validation for required field
    campaignEndDate: { type: Date }, // Optional if noEndDate is true
  },
  adFormat: {
    adFormat: { type: String, required: true }, // Validation for required field
    deviceType: { type: String, required: true }, // Validation for required field
    adPreferences: {
      FacebookFeed: { type: Boolean, default: true },
      InstagramFeed: { type: Boolean, default: true },
      InstagramStories: { type: Boolean, default: false },
      FacebookStories: { type: Boolean, default: true },
      AudienceNetwork: { type: Boolean, default: false },
      MessengerInbox: { type: Boolean, default: false },
    },
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'partner', // Replace 'User' with your actual user model name
    required: true, // Enforce that createdBy is always provided
  },
   
},
{
    timestamps: true
}
);


/* Model */
export const CampaignModel = mongoose.model('Campaign', campaignSchema);