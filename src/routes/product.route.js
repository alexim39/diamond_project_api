import express from 'express';
import { 
    getAllProducts,
    updateProduct,
    Savecart,
    GetAllCartsBy
} from '../controllers/product.controller.js'

const productsRouter = express.Router();



// Get all campaigns createdBy
productsRouter.get('/getAll', getAllProducts);
// Update product
productsRouter.put('/:id', updateProduct);
// purchase transaction on cart
productsRouter.post('/cart', Savecart);
//getAllOrderBy
productsRouter.get('/getAllOrderBy/:partnerId', GetAllCartsBy);

export default productsRouter;