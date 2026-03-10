function saveState() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ courses: state.courses, sortBy: state.sortBy }),
    );
  } catch {
    // Ignore storage failures so the app still works in restricted contexts.
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.courses)) return null;
    return parsed;
  } catch {
    return null;
  }
}
