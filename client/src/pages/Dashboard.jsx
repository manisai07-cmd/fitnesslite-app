import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';

const MEAL_CONFIG = {
  breakfast: { icon: '🌅', label: 'Breakfast' },
  lunch: { icon: '☀️', label: 'Lunch' },
  dinner: { icon: '🌙', label: 'Dinner' },
  snacks: { icon: '🍿', label: 'Snacks' },
};

const Dashboard = () => {
  const { user, updateUser } = useAuth();
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [goalInput, setGoalInput] = useState('');
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalLoading, setGoalLoading] = useState(false);

  useEffect(() => {
    fetchDailyFoods();
  }, []);

  const fetchDailyFoods = async () => {
    try {
      const { data } = await API.get('/food/daily');
      setFoods(data);
    } catch (err) {
      console.error('Failed to fetch foods:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await API.delete(`/food/${id}`);
      setFoods(foods.filter((f) => f._id !== id));
    } catch (err) {
      console.error('Failed to delete food:', err);
    }
  };

  const handleGoalUpdate = async () => {
    const goal = parseInt(goalInput);
    if (!goal || goal <= 0) return;

    setGoalLoading(true);
    try {
      const { data } = await API.put('/user/goal', { calorieGoal: goal });
      updateUser({ calorieGoal: data.calorieGoal });
      setEditingGoal(false);
      setGoalInput('');
    } catch (err) {
      console.error('Failed to update goal:', err);
    } finally {
      setGoalLoading(false);
    }
  };

  // Calculations
  const totalConsumed = foods.reduce((sum, f) => sum + f.calories, 0);
  const calorieGoal = user?.calorieGoal || 2000;
  const remaining = calorieGoal - totalConsumed;
  const progressPct = Math.min((totalConsumed / calorieGoal) * 100, 100);
  const isOver = totalConsumed > calorieGoal;

  // Group foods by meal type
  const groupedFoods = foods.reduce((acc, food) => {
    const type = food.mealType;
    if (!acc[type]) acc[type] = [];
    acc[type].push(food);
    return acc;
  }, {});

  if (loading) {
    return <div className="spinner"></div>;
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <h1>Good {getGreeting()}, {user?.name?.split(' ')[0]} 👋</h1>
        <p>Here's your nutrition summary for today</p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="glass-card stat-card stat-consumed">
          <div className="stat-icon">🔥</div>
          <div>
            <div className="stat-value">{totalConsumed}</div>
            <div className="stat-label">Consumed</div>
          </div>
        </div>
        <div className="glass-card stat-card stat-goal">
          <div className="stat-icon">🎯</div>
          <div>
            <div className="stat-value">{calorieGoal}</div>
            <div className="stat-label">Goal</div>
          </div>
        </div>
        <div className={`glass-card stat-card ${isOver ? 'stat-over' : 'stat-remaining'}`}>
          <div className="stat-icon">{isOver ? '⚠️' : '✅'}</div>
          <div>
            <div className="stat-value">{isOver ? `+${Math.abs(remaining)}` : remaining}</div>
            <div className="stat-label">{isOver ? 'Over' : 'Remaining'}</div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="glass-card progress-section">
        <div className="progress-header">
          <span>Daily Progress</span>
          <span className="progress-pct">{Math.round(progressPct)}%</span>
        </div>
        <div className="progress-track">
          <div
            className={`progress-fill ${isOver ? 'over' : ''}`}
            style={{ width: `${progressPct}%` }}
          ></div>
        </div>
      </div>

      {/* Goal Edit */}
      <div className="goal-edit">
        {editingGoal ? (
          <>
            <input
              type="number"
              className="form-control"
              placeholder="New goal"
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              min="1"
            />
            <button
              className="btn btn-primary"
              onClick={handleGoalUpdate}
              disabled={goalLoading}
            >
              {goalLoading ? '…' : 'Save'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => { setEditingGoal(false); setGoalInput(''); }}
            >
              Cancel
            </button>
          </>
        ) : (
          <button className="btn btn-secondary" onClick={() => setEditingGoal(true)}>
            ✏️ Edit Calorie Goal
          </button>
        )}
      </div>

      {/* Food List by Meal */}
      {foods.length === 0 ? (
        <div className="glass-card empty-state">
          <div className="empty-icon">🍽️</div>
          <p>No food entries for today yet</p>
          <Link to="/add-food" className="btn btn-primary">
            ➕ Add Your First Meal
          </Link>
        </div>
      ) : (
        Object.entries(MEAL_CONFIG).map(([type, config]) => {
          const items = groupedFoods[type];
          if (!items || items.length === 0) return null;

          const mealCals = items.reduce((sum, f) => sum + f.calories, 0);

          return (
            <div className="meal-section" key={type}>
              <div className="meal-header">
                <span className="meal-icon">{config.icon}</span>
                {config.label}
                <span className="meal-cal">{mealCals} cal</span>
              </div>
              {items.map((food) => (
                <div className="food-item" key={food._id}>
                  <div className="food-info">
                    <span className="food-name">{food.foodName}</span>
                    <span className="food-cal">{food.calories} cal</span>
                  </div>
                  <div className="food-actions">
                    <button
                      className="btn btn-danger"
                      onClick={() => handleDelete(food._id)}
                    >
                      ✕ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          );
        })
      )}
    </div>
  );
};

// Helper: greeting based on time of day
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

export default Dashboard;
