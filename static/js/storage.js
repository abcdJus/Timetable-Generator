const BACKEND = 'http://localhost:5000/api';

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
    const our_response = await fetch(`${BACKEND}/courses`);
    const allthe_courses = await our_response.json();
    
    for (const course of allthe_courses) {
      await fetch(`${BACKEND}/courses/${course.id}`, { method: 'DELETE' });
    }
    
    for (const course of state.courses) {
      const res = await fetch(`${BACKEND}/courses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: course.code, color_index: course.colorIndex })
      });
      const saved = await res.json();
      
      for (const section of course.sections) {
        await fetch(`${BACKEND}/courses/${saved.id}/sections`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: section.type,
            label: section.label,
            meetings: section.meetings
          })
        });
      }
    }
  } catch (errors) {
    console.error('Backend sync failed:', errors);
  }
}