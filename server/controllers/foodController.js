const Food = require('../models/Food');

// @desc    Add a food entry
// @route   POST /api/food/add
exports.addFood = async (req, res) => {
  try {
    const { foodName, calories, mealType } = req.body;

    const food = await Food.create({
      userId: req.user.id,
      foodName,
      calories,
      mealType,
    });

    res.status(201).json(food);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get daily food entries for logged-in user
// @route   GET /api/food/daily
exports.getDailyFood = async (req, res) => {
  try {
    // Get start and end of today
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const foods = await Food.find({
      userId: req.user.id,
      date: { $gte: startOfDay, $lt: endOfDay },
    }).sort({ createdAt: -1 });

    res.json(foods);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a food entry
// @route   DELETE /api/food/:id
exports.deleteFood = async (req, res) => {
  try {
    const food = await Food.findById(req.params.id);

    if (!food) {
      return res.status(404).json({ message: 'Food entry not found' });
    }

    // Ensure user owns this entry
    if (food.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Food.findByIdAndDelete(req.params.id);
    res.json({ message: 'Food entry deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
