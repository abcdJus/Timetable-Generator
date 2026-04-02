// Boots the page by loading saved data, preparing state, and rendering the UI.
async function init() {
  const stored = await loadState();
  if (authRedirectInProgress) return;

  state = {
    courses: stored ? normalizeCourses(stored.courses) : [],
    generatedSchedules: [],
    sortedSchedules: [],
    currentIndex: 0,
    hasGenerated: false,
    sortBy: stored?.sortBy || 'default',
  };

  DOM.sortSelect.value = state.sortBy;
  renderGridBackground();
  renderCourses();
  updateMainView();

  try {
    writeLocalState(state.courses, state.sortBy);
  } catch {
    // Ignore storage failures
  }
}

init();
