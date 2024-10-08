import mongoose from 'mongoose';


/* Schema*/
const prospectSchema = mongoose.Schema(
    {
        prospectName: {
            type: String,
            //unique: true,
            required: [true, "Please enter name"]
        },
        prospectSurname: {
            type: String,
            //unique: true,
           // required: [true, "Please enter surname"]
        },
        prospectPhone: {
            type: String,
            unique: true,
            required: [true, "Please enter phone number"]
        },
        prospectEmail: {
            type: String,
            //unique: true,
            //required: [true, "Please enter email address"]
        },
        prospectSource: {
            type: String,
            required: [true, "Please enter source"]
        },
        prospectRemark: {
            type: String,
            //unique: true,
            //required: [true, "Please enter message"]
        },
        partnerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'partner',
            required: true,
        },
        surverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Survey',
        },
        status: {
            type: String,
            default: 'New Prospect'
            //required: [true, "Please enter message"]
        },
        role: {
            type: String,
            default: 'User'
            //required: [true, "Please enter message"]
        },
        
       
    },
    {
        timestamps: true
    }
)

/* Model */
export const ProspectModel = mongoose.model('Prospect', prospectSchema);
