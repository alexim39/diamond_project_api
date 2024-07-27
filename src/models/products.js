import mongoose from 'mongoose';


/* Schema*/
const productSchema = mongoose.Schema(
    {
    
        img: {
            type: String,
            //required: [true, "Please enter image"]
        },
        name: {
            type: String,
            //required: [true, "Please enter name"]
        },
        price: {
            type: Number,
            //required: [true, "Please enter price"]
        },
        desc: {
            type: String,
            //required: [true, "Please enter description"]
        },
        
       
    },
    {
        timestamps: true
    }
)

/* Model */
export const ProductModel = mongoose.model('Product', productSchema);