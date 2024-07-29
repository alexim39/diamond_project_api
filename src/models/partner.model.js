import mongoose from 'mongoose';


/* Schema partners*/
const partnersSchema = mongoose.Schema(
    {
    
        username: {
            type: String,
            unique: true,
            required: [true, "Please enter response for username"]
        },
        name: {
            type: String,
            required: [true, "Please enter name"]
        },
        surname: {
            type: String,
            required: [true, "Please enter surname"]
        },
        address: {
            type: String,
            required: [true, "Please enter address"]
        },
        email: {
            type: String,
            unique: true,
            required: [true, "Please enter email address"]
        },
        phone: {
            type: String,
            unique: true,
            required: [true, "Please enter phone number"]
        },
        reservationCode: {
            type: String,
            unique: true,
            required: [true, "Please enter reservation code"]
        },
        password: {
            type: String,
            required: [true, "Please enter password"]
        },
        tnc: {
            type: Boolean,
            default: false
        },
        status: {
            type: Boolean,
            default: false
        },
        bio: {
            type: String,
        },
        partnerOf: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'partner', // Replace 'User' with your actual user model name
            //required: true, // Enforce that createdBy is always provided
        },       
       
    },
    {
        timestamps: true
    }
)

/* Model */
export const PartnersModel = mongoose.model('Partner', partnersSchema);





/* Reservation Code */
const reservationCodeSchema = mongoose.Schema(
    {
    
        code: {
            type: String,
            unique: true,
            required: [true, "Please enter response for reservation code"]
        },
        
    },
    {
        timestamps: true
    }
)
/* Reservation code Model */
export const ReservationCodeModel = mongoose.model('Reservation-code', reservationCodeSchema);