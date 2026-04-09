const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const { addFood, getDailyFood, deleteFood } = require('../controllers/foodController');

router.post('/add', protect, addFood);
router.get('/daily', protect, getDailyFood);
router.delete('/:id', protect, deleteFood);

module.exports = router;
