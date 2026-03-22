const BACKEND = 'http://127.0.0.1:5000/api';

let syncTimer = null;

function saveState() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ courses: state.courses, sortBy: state.sortBy }),
    );
    clearTimeout(syncTimer);
    syncTimer = setTimeout(syncToBackend, 1000);
  } catch {
    // Ignore storage failures
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

async function syncToBackend() {
  try {
    await fetch(`${BACKEND}/courses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courses: state.courses })
    });
  } catch (errors) {
    console.error('Backend sync failed:', errors);
  }
}