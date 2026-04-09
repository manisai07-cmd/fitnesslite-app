const mongoose = require('mongoose');

const foodSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    foodName: {
      type: String,
      required: [true, 'Food name is required'],
      trim: true,
    },
    calories: {
      type: Number,
      required: [true, 'Calories are required'],
      min: 0,
    },
    mealType: {
      type: String,
      required: [true, 'Meal type is required'],
      enum: ['breakfast', 'lunch', 'dinner', 'snacks'],
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Food', foodSchema);
