import mongoose from 'mongoose';

/* Campaign schema*/
const campaignSchema = mongoose.Schema({
  targetAudience: {
    ageRangeTarget: { type: String, default: 'All' },
    genderTarget: { type: String, default: 'All' },
    locationTarget: { type: String, default: 'States' }, // Can be 'States', 'Cities', or 'Countries' (adjust as needed)
    educationTarget: { type: String, default: 'All' },
    relationshipTarget: { type: String, default: 'All' },
    industryTarget: { type: String, default: 'All' },
  },
  marketingObjectives: {
    adObjective: { type: String, required: true },
    successMeasurement: { type: String},
  },
  budget: {
    budgetType: { type: String, required: true },
    budgetAmount: { type: Number, required: true },
  },
  adDuration: {
    campaignStartDate: { type: Date, required: true },
    noEndDate: { type: Boolean, required: true },
    campaignEndDate: { type: Date },
  },
  adFormat: {
    adFormat: { type: String, required: true },
    deviceType: { type: String, required: true },
    adPreferences: {
      FacebookFeed: { type: Boolean, default: false },
      InstagramFeed: { type: Boolean, default: false },
      InstagramStories: { type: Boolean, default: false },
      FacebookStories: { type: Boolean, default: false },
      AudienceNetwork: { type: Boolean, default: false },
      MessengerInbox: { type: Boolean, default: false },
    },
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'partner', 
    required: true,
  },
  campaignName: {
    type:String,
    required: true,
  },
  deliveryStatus: {
    type:String,
    required: true,
    default: "Pending"
  },
  visits: {
    type:Number,
    default: 0
  },
   
},
{
    timestamps: true
}
);


/* Model */
export const CampaignModel = mongoose.model('Campaign', campaignSchema);