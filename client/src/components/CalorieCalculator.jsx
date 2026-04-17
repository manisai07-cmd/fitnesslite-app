import { useState, useEffect, useRef, useCallback } from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────
const USDA_API_KEY = import.meta.env.VITE_USDA_API_KEY || 'DEMO_KEY';
const USDA_BASE    = 'https://api.nal.usda.gov/fdc/v1';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse "2 eggs + 100g chicken, 1 banana" into
 * [{ qty: 2, unit: '', name: 'eggs' }, { qty: 100, unit: 'g', name: 'chicken' }, ...]
 */
function parseInput(raw) {
  return raw
    .split(/[+,]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((segment) => {
      // Match optional leading number + optional unit + food name
      const match = segment.match(/^(\d+(?:\.\d+)?)\s*(g|kg|ml|oz|cup|cups|tbsp|tsp|lb|piece|pieces)?\s+(.+)$/i);
      if (match) {
        return { qty: parseFloat(match[1]), unit: (match[2] || '').toLowerCase(), name: match[3].trim() };
      }
      // No leading number — treat as 1 serving
      const numlessMatch = segment.match(/^(\d+(?:\.\d+)?)\s+(.+)$/);
      if (numlessMatch) {
        return { qty: parseFloat(numlessMatch[1]), unit: '', name: numlessMatch[2].trim() };
      }
      return { qty: 1, unit: '', name: segment };
    });
}

/**
 * Pull a specific nutrient value (per 100g) from the USDA food nutrients array.
 */
function getNutrient(nutrients, nutrientId) {
  const found = nutrients.find((n) => n.nutrientId === nutrientId || n.nutrient?.id === nutrientId);
  return found ? Math.round((found.value ?? found.amount ?? 0) * 10) / 10 : null;
}

/**
 * Scale a per-100g nutrient value by the requested quantity.
 * If unit is 'g' or 'kg', we know the exact gram weight.
 * Otherwise we treat qty as "number of servings" and use the food's
 * servingSize if available, falling back to treating it as ×qty per 100g.
 */
function scaleNutrient(rawValue, qty, unit, servingSizeG) {
  if (rawValue === null) return null;
  if (unit === 'g')  return Math.round(rawValue * (qty / 100) * 10) / 10;
  if (unit === 'kg') return Math.round(rawValue * (qty * 10) * 10) / 10;
  // Use the food's own serving size if we have it, otherwise 100g baseline
  const grams = servingSizeG || 100;
  return Math.round(rawValue * (grams / 100) * qty * 10) / 10;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const NutrientBadge = ({ emoji, label, value, unit = 'g', colorVar }) => (
  <div className="nutrient-badge" style={{ '--badge-color': `var(${colorVar})` }}>
    <span className="nutrient-badge-emoji">{emoji}</span>
    <div>
      <div className="nutrient-badge-value">
        {value !== null ? `${value}${unit}` : '—'}
      </div>
      <div className="nutrient-badge-label">{label}</div>
    </div>
  </div>
);

const FoodResultCard = ({ result, onUseResult }) => (
  <div className="cc-result-card fade-in">
    <div className="cc-result-header">
      <div>
        <div className="cc-result-name">{result.displayName}</div>
        <div className="cc-result-brand">{result.brand || 'Generic food item'}</div>
      </div>
      <div className="cc-result-calories">
        <span className="cc-cal-value">{result.calories ?? '—'}</span>
        <span className="cc-cal-unit">kcal</span>
      </div>
    </div>

    <div className="cc-nutrient-row">
      <NutrientBadge emoji="🥩" label="Protein"  value={result.protein} colorVar="--accent-blue"   />
      <NutrientBadge emoji="🌾" label="Carbs"    value={result.carbs}   colorVar="--accent-orange" />
      <NutrientBadge emoji="🧴" label="Fat"      value={result.fat}     colorVar="--accent-purple" />
    </div>

    {onUseResult && (
      <button
        className="btn btn-secondary cc-use-btn"
        onClick={() => onUseResult(result)}
        title="Pre-fill the Add Food form with this item"
      >
        ✅ Use this result
      </button>
    )}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * CalorieCalculator
 *
 * Props:
 *   onUseResult(result) — optional callback fired when user clicks "Use this result".
 *                         result = { displayName, calories, protein, carbs, fat }
 */
const CalorieCalculator = ({ onUseResult }) => {
  const [inputValue,    setInputValue]    = useState('');
  const [results,       setResults]       = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState('');
  const [suggestions,   setSuggestions]   = useState([]);
  const [showSuggest,   setShowSuggest]   = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);

  const suggestTimer = useRef(null);
  const inputRef     = useRef(null);
  const suggestRef   = useRef(null);

  // Total calories across all result cards
  const totalCalories = results.reduce((sum, r) => sum + (r.calories ?? 0), 0);

  // ── Autocomplete ─────────────────────────────────────────────────────────────

  const fetchSuggestions = useCallback(async (query) => {
    if (!query || query.length < 2) { setSuggestions([]); return; }
    setSuggestLoading(true);
    try {
      const resp = await fetch(
        `${USDA_BASE}/foods/search?api_key=${USDA_API_KEY}&query=${encodeURIComponent(query)}&pageSize=6&dataType=Foundation,SR%20Legacy`
      );
      if (!resp.ok) throw new Error('Autocomplete fetch failed');
      const data = await resp.json();
      setSuggestions((data.foods || []).map((f) => f.description));
    } catch {
      setSuggestions([]);
    } finally {
      setSuggestLoading(false);
    }
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val);

    // Debounce: autocomplete on the LAST token (after last + or ,)
    clearTimeout(suggestTimer.current);
    const lastToken = val.split(/[+,]/).pop().trim();
    if (lastToken.length >= 2) {
      suggestTimer.current = setTimeout(() => {
        fetchSuggestions(lastToken);
        setShowSuggest(true);
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggest(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    // Replace the last token with the selected suggestion
    const parts = inputValue.split(/(?=[+,])/);
    parts[parts.length - 1] = ' ' + suggestion;
    // If the original last segment started without a delimiter, just replace it
    const tokens = inputValue.split(/[+,]/);
    tokens[tokens.length - 1] = ' ' + suggestion;
    setInputValue(tokens.join('+'));
    setSuggestions([]);
    setShowSuggest(false);
    inputRef.current?.focus();
  };

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e) => {
      if (suggestRef.current && !suggestRef.current.contains(e.target)) {
        setShowSuggest(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Fetch Calories ────────────────────────────────────────────────────────────

  const fetchCaloriesForItem = async ({ qty, unit, name }) => {
    const resp = await fetch(
      `${USDA_BASE}/foods/search?api_key=${USDA_API_KEY}&query=${encodeURIComponent(name)}&pageSize=1&dataType=Foundation,SR%20Legacy`
    );
    if (!resp.ok) throw new Error(`API error for "${name}"`);
    const data = await resp.json();

    if (!data.foods || data.foods.length === 0) {
      return { displayName: `${qty > 1 ? qty + ' ' : ''}${name}`, notFound: true };
    }

    const food = data.foods[0];
    const nutrients = food.foodNutrients || [];

    // USDA nutrient IDs: Energy=1008, Protein=1003, Carbs=1005, Fat=1004
    const cal100  = getNutrient(nutrients, 1008);
    const prot100 = getNutrient(nutrients, 1003);
    const carb100 = getNutrient(nutrients, 1005);
    const fat100  = getNutrient(nutrients, 1004);

    // Serving size in grams from USDA (may be null)
    const servingSizeG =
      food.servingSize && food.servingSizeUnit?.toLowerCase() === 'g'
        ? food.servingSize
        : null;

    const label = qty !== 1 ? `${qty}${unit ? unit : 'x'} ${name}` : name;

    return {
      displayName: label.charAt(0).toUpperCase() + label.slice(1),
      brand:       food.brandOwner || food.dataType || null,
      calories:    scaleNutrient(cal100,  qty, unit, servingSizeG),
      protein:     scaleNutrient(prot100, qty, unit, servingSizeG),
      carbs:       scaleNutrient(carb100, qty, unit, servingSizeG),
      fat:         scaleNutrient(fat100,  qty, unit, servingSizeG),
      notFound:    false,
    };
  };

  const handleCalculate = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    setError('');
    setResults([]);
    setLoading(true);
    setShowSuggest(false);

    const items = parseInput(trimmed);

    try {
      const settled = await Promise.allSettled(items.map(fetchCaloriesForItem));
      const resolved = settled.map((s, i) => {
        if (s.status === 'fulfilled') return s.value;
        return { displayName: items[i].name, notFound: true, error: s.reason?.message };
      });

      if (resolved.every((r) => r.notFound)) {
        setError('No food items were found. Try different names or check your spelling.');
      } else {
        setResults(resolved);
      }
    } catch (err) {
      setError(`Something went wrong: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleCalculate();
    if (e.key === 'Escape') { setSuggestions([]); setShowSuggest(false); }
  };

  const handleClear = () => {
    setInputValue('');
    setResults([]);
    setError('');
    setSuggestions([]);
    inputRef.current?.focus();
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="cc-wrapper glass-card">
      {/* Header */}
      <div className="cc-header">
        <div className="cc-title-group">
          <span className="cc-icon">🔥</span>
          <div>
            <h2 className="cc-title">Calorie Calculator</h2>
            <p className="cc-subtitle">Look up nutrition for any food — instantly</p>
          </div>
        </div>
      </div>

      {/* Input area */}
      <div className="cc-input-section" ref={suggestRef}>
        <div className="cc-input-wrapper">
          <span className="cc-input-icon">🍽️</span>
          <input
            ref={inputRef}
            id="cc-food-input"
            type="text"
            className="form-control cc-input"
            placeholder='e.g. "2 eggs + 1 banana + 100g chicken"'
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setShowSuggest(true)}
            autoComplete="off"
          />
          {inputValue && (
            <button className="cc-clear-btn" onClick={handleClear} title="Clear" aria-label="Clear input">
              ✕
            </button>
          )}
        </div>

        {/* Autocomplete dropdown */}
        {showSuggest && (suggestLoading || suggestions.length > 0) && (
          <ul className="cc-suggestions" role="listbox">
            {suggestLoading ? (
              <li className="cc-suggest-loading">Searching…</li>
            ) : (
              suggestions.map((s, i) => (
                <li
                  key={i}
                  className="cc-suggest-item"
                  onMouseDown={() => handleSuggestionClick(s)}
                  role="option"
                >
                  🔍 {s}
                </li>
              ))
            )}
          </ul>
        )}

        <p className="cc-hint">
          Separate multiple foods with <strong>+</strong> or <strong>,</strong>. Add quantity: <em>2 eggs</em>, <em>100g chicken</em>.
        </p>
      </div>

      {/* Action button */}
      <button
        id="cc-calculate-btn"
        className="btn btn-primary cc-calc-btn"
        onClick={handleCalculate}
        disabled={loading || !inputValue.trim()}
      >
        {loading ? (
          <>
            <span className="cc-spinner" />
            Calculating…
          </>
        ) : (
          <>🧮 Calculate Calories</>
        )}
      </button>

      {/* Error */}
      {error && <div className="alert cc-error">{error}</div>}

      {/* Results */}
      {results.length > 0 && (
        <div className="cc-results-section">
          {results.map((r, i) =>
            r.notFound ? (
              <div key={i} className="cc-not-found">
                <span>⚠️</span>
                <span>
                  <strong>&quot;{r.displayName}&quot;</strong> — not found in the USDA database.{' '}
                  {r.error ? `(${r.error})` : 'Try a different name.'}
                </span>
              </div>
            ) : (
              <FoodResultCard
                key={i}
                result={r}
                onUseResult={onUseResult || null}
              />
            )
          )}

          {/* Total banner */}
          {results.filter((r) => !r.notFound).length > 1 && (
            <div className="cc-total-banner fade-in">
              <div className="cc-total-label">
                <span>⚡</span> Total Calories
              </div>
              <div className="cc-total-value">
                {totalCalories} <span className="cc-total-unit">kcal</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CalorieCalculator;
