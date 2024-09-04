import express from 'express';
import { 
    getAllProducts,
    updateProduct,
    Savecart,
    GetAllCarts
} from '../controllers/product.js'

const productsRouter = express.Router();



// Get all campaigns createdBy
productsRouter.get('/getAll', getAllProducts);
// Update product
productsRouter.put('/:id', updateProduct);
// purchase transaction on cart
productsRouter.post('/cart', Savecart);
// get all carts
productsRouter.get('/carts', GetAllCarts);

export default productsRouter;