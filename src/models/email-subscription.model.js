import mongoose from 'mongoose';


/* Schema*/
const emailSubscriptionSchema = mongoose.Schema(
    {
    
        email: {
            type: String,
            unique: true,
            required: [true, "Please enter email address"]
        },
        status: {
            type: String,
            default: 'Subscribed',
            //required: [true, "Please enter surname"]
        },
        userDevice: {
            type: String,
            //unique: true,
            //required: [true, "Please enter surname"]
        },
        username: {
            type: String,
            default: 'business',
            unique: true,
            //required: [true, "Please enter username"]
        },
        
       
    },
    {
        timestamps: true
    }
)

/* Model */
export const EmailSubscriptionModel = mongoose.model('Email-subscription', emailSubscriptionSchema);