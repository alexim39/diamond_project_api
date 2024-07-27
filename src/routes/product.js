import express from 'express';
import { 
    getAllProducts,
    updateProduct
} from '../controllers/product.js'

const productsRouter = express.Router();



// Get all campaigns createdBy
productsRouter.get('/getAll', getAllProducts);

// Update product
productsRouter.put('/:id', updateProduct);

export default productsRouter;