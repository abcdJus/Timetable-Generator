function normalizeSection(section = {}) {
  return {
    id: section.id || generateId(),
    type: SECTION_TYPES.includes(section.type) ? section.type : 'Lecture',
    label: String(section.label || '').toUpperCase(),
    meetings:
      Array.isArray(section.meetings) && section.meetings.length > 0
        ? section.meetings.map((meeting) => normalizeMeeting(meeting))
        : [createMeeting()],
  };
}

function normalizeDraftSection(draftSection = {}, fallbackType = 'Lecture') {
  return {
    type: SECTION_TYPES.includes(draftSection.type)
      ? draftSection.type
      : fallbackType,
    label: String(draftSection.label || '').toUpperCase(),
    meetings:
      Array.isArray(draftSection.meetings) && draftSection.meetings.length > 0
        ? draftSection.meetings.map((meeting) => normalizeMeeting(meeting))
        : [createMeeting()],
  };
}

function normalizeCourse(course = {}, index = 0) {
  const sections = Array.isArray(course.sections)
    ? course.sections.map((section) => normalizeSection(section))
    : [];
  const defaultType = sections[0]?.type || 'Lecture';
  const editingSectionId = sections.some(
    (section) => section.id === course.editingSectionId,
  )
    ? course.editingSectionId
    : null;

  return {
    id: course.id || generateId(),
    code: String(course.code || '').trim().toUpperCase(),
    colorIndex: Number.isInteger(course.colorIndex)
      ? course.colorIndex
      : index % COLORS.length,
    expanded: Boolean(course.expanded),
    sections,
    draftSection: normalizeDraftSection(course.draftSection, defaultType),
    editingSectionId,
    editingDraftSection: editingSectionId
      ? normalizeSection(
          course.editingDraftSection ||
            sections.find((section) => section.id === editingSectionId),
        )
      : null,
  };
}

function normalizeCourses(courses = []) {
  return courses
    .map((course, index) => normalizeCourse(course, index))
    .filter((course) => course.code);
}

function buildSampleCourses() {
  return SAMPLE_COURSES.map((course, index) =>
    createCourse(
      course.code,
      course.colorIndex ?? index % COLORS.length,
      course.sections,
    ),
  );
}

let state = {
  courses: [],
  generatedSchedules: [],
  sortedSchedules: [],
  currentIndex: 0,
  hasGenerated: false,
  sortBy: 'default',
};
