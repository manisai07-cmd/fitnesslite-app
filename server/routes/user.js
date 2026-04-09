const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const { getProfile, updateGoal } = require('../controllers/userController');

router.get('/profile', protect, getProfile);
router.put('/goal', protect, updateGoal);

module.exports = router;
