import express from 'express';
import { requireAuth } from '../../../shared/http/requireAuth.js';
import { requireRole } from '../../../modules/identity-access/interface/RequireRole.js';
import { 
    getAllProducts,
    updateProduct,
    Savecart,
    GetAllCartsBy,
    listOrdersForAdmin,
    decideOrder
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
// Admin order queue (role-gated)
ProductRouter.get('/orders', requireAuth, requireRole('admin'), listOrdersForAdmin);
ProductRouter.patch('/orders/:id', requireAuth, requireRole('admin'), decideOrder);


export default ProductRouter;