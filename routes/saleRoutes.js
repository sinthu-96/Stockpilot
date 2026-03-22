const express = require('express');
const router = express.Router();
const saleController = require('../controllers/saleController');

router.post('/', saleController.recordSale);
router.get('/', saleController.getSalesHistory);
router.get('/stats', saleController.getDashboardStats);

module.exports = router;
