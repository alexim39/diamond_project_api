import mongoose from 'mongoose';


/* Schema*/
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
        prospectId: {  
            type: mongoose.Schema.Types.ObjectId,  
            ref: 'Prospect',  
            validate: {  
                validator: function(v) {  
                    // Allow null or a valid ObjectId  
                    return v === null || mongoose.Types.ObjectId.isValid(v);  
                },  
                message: props => `${props.value} is not a valid ObjectId!`  
            },  
            required: [function() {  
                // Make required only if prospectId is not null  
                return this.prospectId !== null;  
            }, "prospectId is required when set"],  
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