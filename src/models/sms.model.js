import mongoose from 'mongoose';  

/* Schema */  
const ParterSMSSchema = mongoose.Schema(  
    {  
        smsBody: {  
            type: String,  
            required: [true, "Please enter answer 2"]  
        },  
        partnerId: {  
            type: mongoose.Schema.Types.ObjectId,  
            ref: 'partner',  
            required: true,  
        },  
        prospect: {  
            type: [String],  // Allow array of strings  
            validate: {  
                validator: function(v) {  
                    // Check if v is an array of strings  
                    return Array.isArray(v) && v.every(email => typeof email === 'string');  
                },  
                message: props => `${props.value} is not a valid array of emails!`  
            },  
            required: [true, "prospect is required"]  // Make required  
        },  
        transactionId: {  
            type: mongoose.Schema.Types.ObjectId,  
            ref: 'Transaction',  
            required: true,  
        },  
        status: {  
            type: String,  
            required: true  
        }  
    },  
    {  
        timestamps: true  
    }  
);  

/* Model */  
export const ParterSMSModel = mongoose.model('Partner-sms', ParterSMSSchema);