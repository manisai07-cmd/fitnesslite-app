import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';

const AddFood = () => {
  const [formData, setFormData] = useState({
    foodName: '',
    calories: '',
    mealType: 'breakfast',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await API.post('/food/add', {
        foodName: formData.foodName,
        calories: parseInt(formData.calories),
        mealType: formData.mealType,
      });

      setSuccess(`"${formData.foodName}" added successfully!`);
      setFormData({ foodName: '', calories: '', mealType: formData.mealType });

      // Redirect after a short delay so the user sees the success message
      setTimeout(() => navigate('/'), 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add food entry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Add Food Entry</h1>
        <p>Log what you've eaten</p>
      </div>

      <div className="add-food-card glass-card">
        {error && <div className="alert">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="foodName">Food Name</label>
            <input
              id="foodName"
              type="text"
              name="foodName"
              className="form-control"
              placeholder="e.g. Chicken Salad"
              value={formData.foodName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="calories">Calories</label>
            <input
              id="calories"
              type="number"
              name="calories"
              className="form-control"
              placeholder="e.g. 350"
              value={formData.calories}
              onChange={handleChange}
              required
              min="0"
            />
          </div>

          <div className="form-group">
            <label htmlFor="mealType">Meal Type</label>
            <select
              id="mealType"
              name="mealType"
              className="form-control"
              value={formData.mealType}
              onChange={handleChange}
              required
            >
              <option value="breakfast">🌅 Breakfast</option>
              <option value="lunch">☀️ Lunch</option>
              <option value="dinner">🌙 Dinner</option>
              <option value="snacks">🍿 Snacks</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Adding…' : '➕ Add Food Entry'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddFood;
