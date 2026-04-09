const User = require('../models/User');

// @desc    Get user profile
// @route   GET /api/user/profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update calorie goal
// @route   PUT /api/user/goal
exports.updateGoal = async (req, res) => {
  try {
    const { calorieGoal } = req.body;

    if (!calorieGoal || calorieGoal < 0) {
      return res.status(400).json({ message: 'Valid calorie goal is required' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { calorieGoal },
      { new: true }
    ).select('-password');

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
