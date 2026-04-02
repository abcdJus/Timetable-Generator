const BACKEND = '/api';

let syncTimer = null;
let authRedirectInProgress = false;

// Reads the last locally cached timetable snapshot, if one exists.
function readStoredSnapshot() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

// Writes the current frontend state to localStorage.
function writeLocalState(courses = [], sortBy = 'default') {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ courses, sortBy }),
  );
}

// Cancels any delayed sync that has not been sent to the backend yet.
function clearPendingSync() {
  if (syncTimer !== null) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }
}

// Removes cached timetable data from the browser.
function clearStoredState() {
  clearPendingSync();
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage failures
  }
}

// Sends the user back to login after an expired or missing session.
function redirectToLogin() {
  if (authRedirectInProgress) return;

  authRedirectInProgress = true;
  clearStoredState();
  window.location.assign('/login');
}

// Saves locally first, then schedules a delayed backend sync.
function saveState() {
  clearPendingSync();

  try {
    writeLocalState(state.courses, state.sortBy);
  } catch {
    // Ignore storage failures
  }

  syncTimer = setTimeout(syncToBackend, 1000);
}

// Loads timetable data from the backend and falls back to cached data when needed.
async function loadState() {
  const storedSnapshot = readStoredSnapshot();
  const storedSortBy = storedSnapshot?.sortBy || 'default';

  try {
    const response = await fetch(`${BACKEND}/courses`, {
      credentials: 'include',
    });

    if (response.status === 401) {
      redirectToLogin();
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to load courses: ${response.status}`);
    }

    const backendCourses = await response.json();
    const courses = [];

    for (const course of backendCourses) {
      const sectionResponse = await fetch(
        `${BACKEND}/courses/${course.id}/sections`,
        {
          credentials: 'include',
        },
      );

      if (sectionResponse.status === 401) {
        redirectToLogin();
        return null;
      }

      if (sectionResponse.status === 404) {
        continue;
      }

      if (!sectionResponse.ok) {
        throw new Error(
          `Failed to load sections for course ${course.id}: ${sectionResponse.status}`,
        );
      }

      const sections = await sectionResponse.json();
      courses.push({
        id: String(course.id),
        code: course.code,
        colorIndex: course.color_index,
        expanded: false,
        sections: sections.map((section) => ({
          ...section,
          id: String(section.id),
          meetings: section.meetings.map((meeting) => ({
            ...meeting,
            id: String(meeting.id),
          })),
        })),
      });
    }

    try {
      writeLocalState(courses, storedSortBy);
    } catch {
      // Ignore storage failures
    }

    return { courses, sortBy: storedSortBy };
  } catch (error) {
    if (!authRedirectInProgress) {
      console.error('Failed to load timetable state:', error);
    }

    if (storedSnapshot) {
      return storedSnapshot;
    }

    return { courses: [], sortBy: storedSortBy };
  }
}

// Pushes the current timetable state to the backend for the signed-in user.
async function syncToBackend() {
  if (authRedirectInProgress) return;

  try {
    const response = await fetch(`${BACKEND}/courses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ courses: state.courses }),
    });

    if (response.status === 401) {
      redirectToLogin();
      return;
    }

    if (!response.ok) {
      throw new Error(`Backend sync failed: ${response.status}`);
    }
  } catch (error) {
    if (!authRedirectInProgress) {
      console.error('Backend sync failed:', error);
    }
  }
}

// Logs the user out, clears cached data, and redirects to the login screen.
async function logoutUser() {
  if (authRedirectInProgress) return;

  clearPendingSync();

  try {
    const response = await fetch('/logout', {
      method: 'POST',
      credentials: 'include',
    });

    if (response.status === 401) {
      redirectToLogin();
      return;
    }

    let redirectUrl = '/login';
    if (response.ok) {
      const payload = await response.json().catch(() => null);
      redirectUrl = payload?.redirect_url || redirectUrl;
    }

    clearStoredState();
    authRedirectInProgress = true;
    window.location.assign(redirectUrl);
    return;
  } catch (error) {
    console.error('Logout failed:', error);
  }

  clearStoredState();
  authRedirectInProgress = true;
  window.location.assign('/login');
}
