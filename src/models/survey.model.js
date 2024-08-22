import mongoose from 'mongoose';


/* Schema survey*/
const userSurveySchema = mongoose.Schema(
    {
    
        doYouFeelNeedForChange: {
            type: String,
            required: [true, "Please enter answer 1"]
        },
        employedStatus: {
            type: String,
            required: [true, "Please enter answer 2"]
        },
        interestedInEarningAdditionaIcome: {
            type: String,
            required: [true, "Please enter answer 3"]
        },
        doYouBelieveInTraining: {
            type: String,
            required: [true, "Please enter answer 4"]
        },
        areYouOpenToBeCoached: {
            type: String,
            required: [true, "Please enter answer 5"]
        },
        ifSessionIsSet: {
            type: String,
            required: [true, "Please enter answer 6"]
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
            required: [true, "Please enter response for referral"]
        },
        userDevice: {
            type: String,
            //unique: true,
            //required: [true, "Please enter surname"]
        },
        username: {
            type: String,
            default: 'alexim39',
            unique: true,
            //required: [true, "Please enter surname"]
        },
       
    },
    {
        timestamps: true
    }
)

/* Model */
export const SurveyModel = mongoose.model('Survey', userSurveySchema);