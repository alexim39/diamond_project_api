import mongoose from 'mongoose';


/* Schema*/
const emailSubscriptionSchema = mongoose.Schema(
    {
    
        email: {
            type: String,
            unique: true,
            required: [true, "Please enter email address"]
        },
        
       
    },
    {
        timestamps: true
    }
)

/* Model */
export const EmailSubscription = mongoose.model('email-subscription', emailSubscriptionSchema);