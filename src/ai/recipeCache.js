const STORAGE_KEY = 'zestpath.chef.backupRecipe'
const DIFFICULTIES = new Set(['Easy', 'Medium', 'Hard'])

export const DEFAULT_BACKUP_RECIPE = {
  title: 'Garlic Spinach & Feta Omelet',
  time: '10 mins',
  difficulty: 'Easy',
  servings: '2 servings',
  ingredients: [
    '4 Eggs',
    '1 bag Spinach',
    '100 g Feta cheese (crumbled)',
    '2 cloves Garlic (minced)',
    '1 tbsp Butter',
    'Salt and Black pepper to taste',
  ],
  steps: [
    'Heat half of the butter in a pan over medium heat. Add minced garlic and spinach, sautéing until the spinach is wilted (about 2 minutes). Set aside.',
    'In a bowl, whisk the eggs with a pinch of salt and black pepper.',
    'Melt the remaining butter in the skillet, pour in the eggs, and cook gently on low-medium heat until mostly set.',
    'Spoon the cooked spinach and crumbled feta cheese onto one half of the eggs.',
    'Fold the omelet in half, let the cheese warm for 1 minute, and serve hot!',
  ],
}

export function validateRecipe(value) {
  if (!value || typeof value !== 'object') return null

  const title = String(value.title ?? '').trim()
  const time = String(value.time ?? '').trim()
  const difficulty = String(value.difficulty ?? '').trim()
  const servings = String(value.servings ?? '').trim()
  const ingredients = Array.isArray(value.ingredients)
    ? value.ingredients.map((line) => String(line).trim()).filter(Boolean)
    : []
  const steps = Array.isArray(value.steps)
    ? value.steps.map((step) => String(step).trim()).filter(Boolean)
    : []

  if (!title || !time || !servings) return null
  if (!DIFFICULTIES.has(difficulty)) return null
  if (ingredients.length === 0 || steps.length === 0) return null

  return { title, time, difficulty, servings, ingredients, steps }
}

export function readCachedRecipe() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const cached = validateRecipe(JSON.parse(raw))
      if (cached) return cached
    }
  } catch {
    /* ignore broken storage */
  }

  const fallback = validateRecipe(DEFAULT_BACKUP_RECIPE)
  if (fallback) {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback))
      }
    } catch {
      /* ignore quota / private mode */
    }
  }
  return fallback
}

export function writeCachedRecipe(recipe) {
  const valid = validateRecipe(recipe)
  if (!valid) return null
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(valid))
  } catch {
    /* ignore quota / private mode */
  }
  return valid
}

export function isConnectionError(error) {
  const status = error?.status
  return !status || status === 502 || status === 503 || status === 504
}
