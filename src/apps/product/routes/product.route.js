import express from 'express';
import { 
    getAllProducts,
    updateProduct,
    Savecart,
    GetAllCartsBy
} from '../controllers/product.controller.js'
const ProductRouter = express.Router();

// Get all campaigns createdBy
ProductRouter.get('/getAll', getAllProducts);
// Update product
ProductRouter.put('/:id', updateProduct);
// purchase transaction on cart
ProductRouter.post('/cart', Savecart);
//getAllOrderBy
ProductRouter.get('/getAllOrderBy/:partnerId', GetAllCartsBy);


export default ProductRouter;