import mongoose from 'mongoose';


/* Schema survey*/
const userSurveySchema = mongoose.Schema(
    {
    
        ageRange: {
            type: String,
            required: [true, "Please choose age range"]
        },
        socialMedia: { 
            type: [String], 
            required: [true, "Please choose social media channel"]

        },
        employedStatus: {
            type: String,
            required: [true, "Please enter employment status"]
        },
        importanceOfPassiveIncome: {
            type: String,
            required: [true, "Please choose passive income response"]
        },
        onlinePurchaseSchedule: {
            type: String,
            required: [true, "Please choose online purchase response"]
        },
        primaryOnlineBusinessMotivation: {
            type: String,
            required: [true, "Please choose primary motivation response"]
        },
        comfortWithTech: {
            type: String,
            required: [true, "Please choose comfort with tech"]
        },
        onlineBusinessTimeDedication: {
            type: String,
            required: [true, "Please choose hours of dedication"]
        },
        phoneNumber: {
            type: String,
            //unique: true,
            required: [true, "Please enter phone number"]
        },
        email: {
            type: String,
            //unique: true,
            //required: [true, "Please enter email address"]
        },
        name: {
            type: String,
            //unique: true,
            required: [true, "Please enter name"]
        },
        surname: {
            type: String,
            //unique: true,
            required: [true, "Please enter surname"]
        },
        referralCode: {
            type: String,
            //required: [true, "Please enter answer 3"]
        },
        referral: {
            type: String,
            //required: [true, "Please enter response for referral"]
        },
        userDevice: {
            type: String,
            //unique: true,
            //required: [true, "Please enter surname"]
        },
        prospectStatus: {
            type: String,
            default: 'Not Moved',
            //unique: true,
            //required: [true, "Please enter surname"]
        },
        username: {
            type: String,
            default: 'business',
           // unique: true,
            //required: [true, "Please enter username"]
        },
       
    },
    {
        timestamps: true
    }
)

/* Model */
export const SurveyModel = mongoose.model('Survey', userSurveySchema);