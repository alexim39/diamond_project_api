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




// models/Cart.js
const CartSchema = new mongoose.Schema({
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    totalCost: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now }
});
/* Model */
export const CartModel = mongoose.model('Cart', CartSchema);
