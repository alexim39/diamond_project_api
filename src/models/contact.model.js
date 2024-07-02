import mongoose from 'mongoose';


/* Schema*/
const contactSchema = mongoose.Schema(
    {
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
        email: {
            type: String,
            unique: true,
            required: [true, "Please enter email address"]
        },
        subject: {
            type: String,
            //unique: true,
            required: [true, "Please enter subject"]
        },
        message: {
            type: String,
            //unique: true,
            required: [true, "Please enter message"]
        },
        
       
    },
    {
        timestamps: true
    }
)

/* Model */
export const ContactModel = mongoose.model('contact', contactSchema);



/* pre-approach */
/* Schema*/
const downloadSchema = mongoose.Schema(
    {
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
        email: {
            type: String,
            unique: true,
            required: [true, "Please enter email address"]
        },
        phone: {
            type: String,
            //unique: true,
            required: [true, "Please enter phone number"]
        }
        
       
    },
    {
        timestamps: true
    }
)

/* Model */
export const PreapproachDownloadModel = mongoose.model('preapproach-download', downloadSchema);