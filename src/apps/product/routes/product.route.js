import express from 'express';
import { bookingForm} from '../controllers/product.controller.js'
const ProductRouter = express.Router();

// User booking
ProductRouter.post('/submit', bookingForm);


export default ProductRouter;