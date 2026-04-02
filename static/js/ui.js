// Finds one course in the current state by its id.
function getCourse(courseId) {
  return state.courses.find((course) => course.id === courseId);
}

// Returns either the add form draft or the edit form draft for a course.
function getDraftSection(course, scope = 'add') {
  return scope === 'edit' ? course.editingDraftSection : course.draftSection;
}

// Finds one draft meeting inside the currently active draft section.
function getDraftMeeting(course, meetingId, scope = 'add') {
  const draft = getDraftSection(course, scope);
  return draft?.meetings.find((meeting) => meeting.id === meetingId);
} 

// Opens a section in edit mode using a cloned draft copy.
function startEditingSection(course, section) {
  course.editingSectionId = section.id;
  course.editingDraftSection = normalizeSection(clone(section));
}

// Closes edit mode and clears the temporary draft.
function stopEditingSection(course) {
  course.editingSectionId = null;
  course.editingDraftSection = null;
}

// Clears previously generated results after the course data changes.
function resetGeneratedState() {
  state.generatedSchedules = [];
  state.sortedSchedules = [];
  state.currentIndex = 0;
  state.hasGenerated = false;
}

// Returns courses that still need at least one section before generation can run.
function getIncompleteCourses() {
  return state.courses.filter((course) => course.sections.length === 0);
}

// Returns true only when every current course is ready for schedule generation.
function canGenerateSchedules() {
  return state.courses.length > 0 && getIncompleteCourses().length === 0;
}

// Picks the semantic color name used for one course across the UI.
function getCourseColorName(course) {
  return COLORS[course.colorIndex % COLORS.length];
}

// Updates the helper text that explains why generation is currently blocked.
function updateGenerateHelp() {
  const incompleteCourses = getIncompleteCourses();

  if (state.courses.length === 0) {
    DOM.generateHelp.textContent = '';
    DOM.generateHelp.classList.add('is-hidden');
    DOM.generateBtn.removeAttribute('title');
    return;
  }

  if (incompleteCourses.length === 0) {
    DOM.generateHelp.textContent = '';
    DOM.generateHelp.classList.add('is-hidden');
    DOM.generateBtn.removeAttribute('title');
    return;
  }

  const message =
    incompleteCourses.length === 1
      ? `Add at least one section to ${incompleteCourses[0].code} before generating.`
      : 'Add at least one section to every course before generating.';

  DOM.generateHelp.textContent = message;
  DOM.generateHelp.classList.remove('is-hidden');
  DOM.generateBtn.title = message;
}

// Refreshes the small course and section counters in the sidebar.
function updateCounts() {
  DOM.courseCount.textContent = state.courses.length;
  DOM.sectionCount.textContent = state.courses.reduce(
    (sum, course) => sum + course.sections.length,
    0,
  );
}

// Draws the timetable grid background and hour labels.
function renderGridBackground() {
  let rowsHTML = '';

  for (let hour = GRID_START_HOUR; hour <= GRID_END_HOUR; hour++) {
    const top = (hour - GRID_START_HOUR) * HOUR_HEIGHT;
    const label = minsToTime(hour * 60).replace(':00', '');

    rowsHTML += `
      <div class="timetable-hour-row" style="top:${top}px;">
        <div class="timetable-hour-row__inner">
          <span class="timetable-hour-label">${label}</span>
          <div class="timetable-hour-line"></div>
        </div>
      </div>
    `;
  }

  DOM.gridRows.innerHTML = rowsHTML;
}

// Builds the HTML for the editable meeting rows inside a draft section.
function renderDraftMeetings(course, draft, scope) {
  return draft.meetings
    .map(
      (meeting, index) => `
        <div class="meeting-card">
          <div class="meeting-card__header">
            <span class="meeting-card__title">Meeting ${index + 1}</span>
            <button
              class="mini-button mini-button--danger remove-draft-meeting-btn"
              data-course-id="${course.id}"
              data-draft-scope="${scope}"
              data-meeting-id="${meeting.id}"
              ${draft.meetings.length === 1 ? 'disabled' : ''}
              title="Remove meeting"
              type="button"
            >
              Remove
            </button>
          </div>
          <div class="meeting-card__fields">
            <select
              class="editor-select draft-day-select"
              data-course-id="${course.id}"
              data-draft-scope="${scope}"
              data-meeting-id="${meeting.id}"
            >
              ${DAYS.map((day) => `<option value="${day}" ${day === meeting.day ? 'selected' : ''}>${day}</option>`).join('')}
            </select>
            <input
              type="time"
              value="${meeting.start}"
              class="editor-input draft-start-input"
              data-course-id="${course.id}"
              data-draft-scope="${scope}"
              data-meeting-id="${meeting.id}"
            />
            <input
              type="time"
              value="${meeting.end}"
              class="editor-input draft-end-input"
              data-course-id="${course.id}"
              data-draft-scope="${scope}"
              data-meeting-id="${meeting.id}"
            />
          </div>
        </div>
      `,
    )
    .join('');
}

// Builds the add/edit section editor block shown inside each course card.
function renderSectionEditor(course, draft, options = {}) {
  if (!draft) return '';

  const scope = options.scope || 'add';
  const title = options.title || 'Add section option';
  const description =
    options.description ||
    'One course can include lectures, tutorials, practicals, seminars, and labs.';
  const saveLabel = options.saveLabel || 'Add Section';
  const showCancel = Boolean(options.showCancel);
  const editorClass = options.isEditing
    ? 'section-editor section-editor--editing'
    : 'section-editor';
  const saveButtonClass = options.isEditing
    ? 'primary-button primary-button--compact section-editor__save-button section-editor__save-button--editing'
    : 'primary-button primary-button--compact section-editor__save-button';

  return `
    <div class="${editorClass}">
      <div class="section-editor__header">
        <div class="section-editor__heading">
          <div class="section-editor__title">${escapeHtml(title)}</div>
          <div class="section-editor__description">${escapeHtml(description)}</div>
        </div>
        <button
          class="secondary-button secondary-button--compact add-draft-meeting-btn"
          data-course-id="${course.id}"
          data-draft-scope="${scope}"
          type="button"
        >
          Add Meeting
        </button>
      </div>

      <div class="section-editor__fields">
        <select
          class="editor-select draft-type-select"
          data-course-id="${course.id}"
          data-draft-scope="${scope}"
        >
          ${SECTION_TYPES.map((type) => `<option value="${type}" ${type === draft.type ? 'selected' : ''}>${type}</option>`).join('')}
        </select>
        <input
          type="text"
          value="${escapeHtml(draft.label)}"
          placeholder="Label (e.g. LEC01)"
          class="editor-input editor-input--uppercase draft-label-input"
          data-course-id="${course.id}"
          data-draft-scope="${scope}"
        />
      </div>

      <div class="meeting-list">
        ${renderDraftMeetings(course, draft, scope)}
      </div>

      <div class="section-editor__actions">
        <button
          class="${saveButtonClass} save-section-btn"
          data-course-id="${course.id}"
          data-draft-scope="${scope}"
          type="button"
        >
          ${escapeHtml(saveLabel)}
        </button>
        ${showCancel ? `<button class="secondary-button secondary-button--compact cancel-edit-btn" data-course-id="${course.id}" type="button">Cancel</button>` : ''}
      </div>
    </div>
  `;
}

// Renders the full sidebar list of courses, sections, and section editors.
function renderCourses() {
  if (state.courses.length === 0) {
    DOM.courseList.innerHTML = `
      <div class="course-list-empty">
        No courses added yet. Start by adding a course code above.
      </div>
    `;
    DOM.generateBtn.disabled = true;
    updateCounts();
    updateGenerateHelp();
    return;
  }

  DOM.generateBtn.disabled = !canGenerateSchedules();
  updateCounts();
  updateGenerateHelp();

  DOM.courseList.innerHTML = state.courses
    .map((course) => {
      const colorName = getCourseColorName(course);
      const grouped = groupSectionsByType(course.sections);

      let contentHTML = '';

      if (course.expanded) {
        const groupedHTML = Object.entries(grouped)
          .map(
            ([type, sections]) => `
              <div class="section-group">
                <div class="section-group__header">
                  <div>
                    <div class="section-group__title">${escapeHtml(type)}</div>
                    <div class="section-group__subtitle">Choose one of these when generating timetables</div>
                  </div>
                  <span class="section-group__count">${sections.length}</span>
                </div>

                <div class="section-group__list">
                  ${sections
                    .map((section) => {
                      if (
                        section.id === course.editingSectionId &&
                        course.editingDraftSection
                      ) {
                        return renderSectionEditor(course, course.editingDraftSection, {
                          scope: 'edit',
                          title: `Editing ${section.label}`,
                          description: 'Update this section right here.',
                          saveLabel: 'Save Changes',
                          showCancel: true,
                          isEditing: true,
                        });
                      }

                      return `
                        <div class="section-item">
                          <div class="section-item__main">
                            <span class="section-item__title">
                              ${escapeHtml(section.label)}
                              <span class="section-item__type">(${escapeHtml(section.type)})</span>
                            </span>

                            ${section.meetings
                              .map(
                                (meeting) => `
                                  <span class="section-item__meeting">
                                    ${meeting.day} ${meeting.start} - ${meeting.end}
                                  </span>
                                `,
                              )
                              .join('')}
                          </div>

                          <div class="section-item__actions">
                            <button
                              class="mini-button edit-section-btn"
                              data-course-id="${course.id}"
                              data-section-id="${section.id}"
                              title="Edit section"
                              type="button"
                            >
                              Edit
                            </button>
                            <button
                              class="mini-button mini-button--danger delete-section-btn"
                              data-course-id="${course.id}"
                              data-section-id="${section.id}"
                              title="Delete section"
                              type="button"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      `;
                    })
                    .join('')}
                </div>
              </div>
            `,
          )
          .join('');

        const builderHTML = renderSectionEditor(course, course.draftSection, {
          scope: 'add',
          title: 'Add section option',
          description:
            'One course can include lectures, tutorials, practicals, seminars, and labs.',
          saveLabel: 'Add Section',
        });

        contentHTML = `
          <div class="course-card__content">
            ${groupedHTML}
            ${builderHTML}
          </div>
        `;
      }

      return `
        <div class="course-card">
          <div
            class="course-card__header ${course.expanded ? 'course-card__header--expanded' : ''} toggle-course-btn"
            data-course-id="${course.id}"
          >
            <div class="course-card__summary">
              <div class="course-card__dot course-card__dot--${colorName}"></div>
              <span class="course-card__code">${escapeHtml(course.code)}</span>
              <span class="course-card__badge">${course.sections.length} sections</span>
            </div>
            <button
              class="mini-button mini-button--danger delete-course-btn"
              data-course-id="${course.id}"
              title="Delete course"
              type="button"
            >
              Delete
            </button>
          </div>
          ${contentHTML}
        </div>
      `;
    })
    .join('');
}

// Renders the currently selected generated schedule onto the timetable grid.
function renderTimetable() {
  if (state.sortedSchedules.length === 0) {
    DOM.gridColumns.innerHTML = '';
    DOM.timetableContainer.classList.add('is-hidden');
    return;
  }

  DOM.timetableContainer.classList.remove('is-hidden');
  const currentSchedule = state.sortedSchedules[state.currentIndex];
  let columnsHTML = '';

  DAYS.forEach((day) => {
    const dayMeetings = [];

    currentSchedule.selections.forEach((section) => {
      section.meetings.forEach((meeting) => {
        if (meeting.day === day) {
          dayMeetings.push({
            ...meeting,
            courseCode: section.courseCode,
            type: section.type,
            label: section.label,
            colorName: section.colorName,
          });
        }
      });
    });

    dayMeetings.sort((a, b) => timeToMins(a.start) - timeToMins(b.start));

    const blocksHTML = dayMeetings
      .map((meeting) => {
        const startMins = timeToMins(meeting.start);
        const endMins = timeToMins(meeting.end);
        const topPx = ((startMins - GRID_START_HOUR * 60) / 60) * HOUR_HEIGHT;
        const heightPx = ((endMins - startMins) / 60) * HOUR_HEIGHT;
        const isCompactBlock = heightPx <= HOUR_HEIGHT + 8;
        const compactClass = isCompactBlock ? ' schedule-block--compact' : '';

        return `
          <div
            class="schedule-block schedule-block--${meeting.colorName}${compactClass}"
            style="top:${topPx}px; height:${heightPx}px;"
          >
            <div class="schedule-block__course">${escapeHtml(meeting.courseCode)}</div>
            <div class="schedule-block__meta">${escapeHtml(meeting.label)} (${escapeHtml(meeting.type)})</div>
            <div class="schedule-block__time">${minsToTime(startMins)} - ${minsToTime(endMins)}</div>
          </div>
        `;
      })
      .join('');

    columnsHTML += `
      <div class="timetable-column" style="height:${GRID_HEIGHT}px;">
        ${blocksHTML}
      </div>
    `;
  });

  DOM.gridColumns.innerHTML = columnsHTML;
  DOM.paginationText.textContent = `Option ${state.currentIndex + 1} of ${state.sortedSchedules.length}`;
  DOM.statDays.textContent = currentSchedule.daysCount;
  DOM.statStart.textContent = minsToTime(currentSchedule.earliestStart);
  DOM.statEnd.textContent = minsToTime(currentSchedule.latestEnd);
  DOM.prevBtn.disabled = state.currentIndex === 0;
  DOM.nextBtn.disabled =
    state.currentIndex === state.sortedSchedules.length - 1;
}

// Switches between the empty state, error state, and generated results view.
function updateMainView() {
  if (!state.hasGenerated) {
    DOM.emptyState.classList.remove('is-hidden');
    DOM.resultsState.classList.add('is-hidden');
    return;
  }

  DOM.emptyState.classList.add('is-hidden');
  DOM.resultsState.classList.remove('is-hidden');

  if (state.sortedSchedules.length > 0) {
    DOM.errorState.classList.add('is-hidden');
    DOM.scheduleStats.classList.remove('is-hidden');
    DOM.paginationControls.classList.remove('is-hidden');
    DOM.sortControls.classList.remove('is-hidden');
    renderTimetable();
  } else {
    DOM.errorState.classList.remove('is-hidden');
    DOM.scheduleStats.classList.add('is-hidden');
    DOM.paginationControls.classList.add('is-hidden');
    DOM.sortControls.classList.add('is-hidden');
    DOM.timetableContainer.classList.add('is-hidden');
  }
}

// Generates every conflict-free timetable combination from the current courses.
function generateAlgorithm() {
  if (!canGenerateSchedules()) {
    alert('Add at least one section option to every course before generating timetables.');
    return;
  }

  const results = [];

  // Walks course by course through every valid schedule combination.
  function walkCourses(courseIndex, selectedSections, selectedMeetings) {
    if (courseIndex === state.courses.length) {
      results.push(analyzeSchedule(clone(selectedSections)));
      return;
    }

    const course = state.courses[courseIndex];
    const grouped = groupSectionsByType(course.sections);
    const sectionTypes = Object.keys(grouped);

    // Picks one section from each section type inside the current course.
    function chooseOnePerType(typeIndex, chosenForCourse, courseMeetings) {
      if (typeIndex === sectionTypes.length) {
        walkCourses(
          courseIndex + 1,
          [...selectedSections, ...chosenForCourse],
          [...selectedMeetings, ...courseMeetings],
        );
        return;
      }

      const candidates = grouped[sectionTypes[typeIndex]];

      for (const section of candidates) {
        const meetingsInPlay = [...selectedMeetings, ...courseMeetings];
        if (sectionConflictsWithMeetings(section, meetingsInPlay)) continue;

        chooseOnePerType(
          typeIndex + 1,
          [
            ...chosenForCourse,
            {
              ...clone(section),
              courseCode: course.code,
              colorName: getCourseColorName(course),
            },
          ],
          [...courseMeetings, ...clone(section.meetings)],
        );
      }
    }

    chooseOnePerType(0, [], []);
  }

  walkCourses(0, [], []);
  state.generatedSchedules = results;
  state.hasGenerated = true;
  sortSchedules();
  updateMainView();
}
