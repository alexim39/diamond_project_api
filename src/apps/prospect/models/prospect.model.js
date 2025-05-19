import mongoose from 'mongoose';
import { CommunicationSchema } from "./communications.schema.js";
import { StatusSchema } from "./status.schema.js";


/* Schema*/
const prospectSchema = mongoose.Schema(
    {
        prospectName: {
            type: String,
            required: [true, "Please enter name"]
        },
        prospectSurname: {
            type: String,
        },
        prospectPhone: {
            type: String,
            unique: true,
            required: [true, "Please enter phone number"]
        },
        prospectEmail: {
            type: String,
        },
        prospectSource: {
            type: String,
            required: [true, "Please enter source"]
        },
        communications: [CommunicationSchema],
        partnerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'partner',
            required: true,
        },
        surverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Survey',
        },
        status: StatusSchema,
        role: {
            type: String,
            default: 'User'
        },
        survey: {
            ageRange: {
                type: String,
            },
            socialMedia: { 
                type: [String],     
            },
            employedStatus: {
                type: String,
            },
            importanceOfPassiveIncome: {
                type: String,
            },
            onlinePurchaseSchedule: {
                type: String,
            },
            primaryOnlineBusinessMotivation: {
                type: String,
            },
            comfortWithTech: {
                type: String,
            },
            onlineBusinessTimeDedication: {
                type: String,
            },
            referralCode: {
                type: String,
            },
            referral: {
                type: String,
            },
            country: { 
                type: String,
                default: 'Nigeria'
             },
              state: { 
                type: String, 
            },
        },
       
    },
    {
        timestamps: true
    }
)

/* Model */
export const ProspectModel = mongoose.model('Prospect', prospectSchema);
