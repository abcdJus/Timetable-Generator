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

async function loadState() {
  try {
    const our_response = await fetch(`${BACKEND}/courses`, {
      credentials: 'include'
    });
    const allthe_courses = await our_response.json();
    console.log('courses from backend:', allthe_courses);
    
    if (allthe_courses.error) {
      return null;
    }

    if (allthe_courses.length > 0) {
      for (const course of allthe_courses) {
        const sec_response = await fetch(`${BACKEND}/courses/${course.id}/sections`, {
          credentials: 'include'
        });
        const sections = await sec_response.json();
        course.colorIndex = course.color_index;
        course.expanded = false;
        course.editingSectionId = null;
        course.editingDraftSection = null;
        course.draftSection = { type: 'Lecture', label: '', meetings: [{ id: Date.now().toString(), day: 'Mon', start: '09:00', end: '10:00' }] };
        course.sections = sections.map(section => ({
          ...section,
          meetings: section.meetings.map(m => ({
            ...m,
            id: String(m.id)
          }))
        }));
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ courses: allthe_courses, sortBy: 'default' }));
      return { courses: allthe_courses, sortBy: 'default' };
    }

    localStorage.removeItem(STORAGE_KEY);
    return null;

  } catch {
    return null;
  }
}

async function syncToBackend() {
  try {
    await fetch(`${BACKEND}/courses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ courses: state.courses })
    });
  } catch (errors) {
    console.error('Backend sync failed:', errors);
  }
}