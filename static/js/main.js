async function init() {
  const stored = await loadState();

  state = {
    courses: stored ? normalizeCourses(stored.courses) : buildSampleCourses(),
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
  saveState();
}

init();
