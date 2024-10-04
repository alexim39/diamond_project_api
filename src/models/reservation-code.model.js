import mongoose from 'mongoose';

/* Schema*/
const reservationCodeSchema = mongoose.Schema(
    {
    
        code: {
            type: String,
            unique: true,
            required: [true, "Please enter response for reservation code"]
        },
        partnerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Partner',
            required: true,
        },
        prospectId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Prospect',
            //required: true,
        },
        status: {
            type: String,
            //unique: true,
            default: 'Pending'
        },
        
       
    },
    {
        timestamps: true
    }
)

/* Model */
export const ReservationCodeModel = mongoose.model('Reservation-code', reservationCodeSchema);