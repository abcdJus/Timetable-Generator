function getCourse(courseId) {
  return state.courses.find((course) => course.id === courseId);
}

function getDraftSection(course, scope = 'add') {
  return scope === 'edit' ? course.editingDraftSection : course.draftSection;
}

function getDraftMeeting(course, meetingId, scope = 'add') {
  const draft = getDraftSection(course, scope);
  return draft?.meetings.find((meeting) => meeting.id === meetingId);
}

function startEditingSection(course, section) {
  course.editingSectionId = section.id;
  course.editingDraftSection = normalizeSection(clone(section));
}

function stopEditingSection(course) {
  course.editingSectionId = null;
  course.editingDraftSection = null;
}

function resetGeneratedState() {
  state.generatedSchedules = [];
  state.sortedSchedules = [];
  state.currentIndex = 0;
  state.hasGenerated = false;
}

function getIncompleteCourses() {
  return state.courses.filter((course) => course.sections.length === 0);
}

function canGenerateSchedules() {
  return state.courses.length > 0 && getIncompleteCourses().length === 0;
}

function updateGenerateHelp() {
  const incompleteCourses = getIncompleteCourses();

  if (state.courses.length === 0 || incompleteCourses.length === 0) {
    DOM.generateHelp.textContent = '';
    DOM.generateHelp.classList.add('hidden');
    DOM.generateBtn.removeAttribute('title');
    return;
  }

  const message =
    incompleteCourses.length === 1
      ? `Add at least one section to ${incompleteCourses[0].code} before generating.`
      : 'Add at least one section to every course before generating.';

  DOM.generateHelp.textContent = message;
  DOM.generateHelp.classList.remove('hidden');
  DOM.generateBtn.title = message;
}

function scrollResultsIntoView() {
  if (window.innerWidth >= 768) return;
  DOM.resultsState.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function updateCounts() {
  DOM.courseCount.textContent = state.courses.length;
  DOM.sectionCount.textContent = state.courses.reduce(
    (sum, course) => sum + course.sections.length,
    0,
  );
}

function renderGridBackground() {
  let rowsHTML = '';

  for (let hour = GRID_START_HOUR; hour <= GRID_END_HOUR; hour++) {
    const top = (hour - GRID_START_HOUR) * HOUR_HEIGHT;
    const label = minsToTime(hour * 60).replace(':00', '');

    rowsHTML += `
      <div class="absolute left-0 right-0" style="top:${top}px;">
        <div class="flex items-center">
          <span class="text-xs text-gray-400 font-medium w-14 text-right pr-3 bg-white relative z-10" style="transform:translateY(-50%);">
            ${label}
          </span>
          <div class="flex-1 border-t border-gray-100"></div>
        </div>
      </div>
    `;
  }

  DOM.gridRows.innerHTML = rowsHTML;
}

function renderDraftMeetings(course, draft, scope) {
  return draft.meetings
    .map(
      (meeting, index) => `
        <div class="border border-gray-200 rounded-lg p-2 bg-gray-50 mb-2">
          <div class="flex items-center justify-between mb-2">
            <span class="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Meeting ${index + 1}</span>
            <button class="remove-draft-meeting-btn text-gray-400 hover:text-red-500 disabled:opacity-30" data-course-id="${course.id}" data-draft-scope="${scope}" data-meeting-id="${meeting.id}" ${draft.meetings.length === 1 ? 'disabled' : ''} title="Remove meeting">
              ${renderIcon('x', 'text-base pointer-events-none')}
            </button>
          </div>
          <div class="grid grid-cols-3 gap-2">
            <select class="draft-day-select border border-gray-200 rounded-md text-xs p-2 bg-white" data-course-id="${course.id}" data-draft-scope="${scope}" data-meeting-id="${meeting.id}">
              ${DAYS.map((day) => `<option value="${day}" ${day === meeting.day ? 'selected' : ''}>${day}</option>`).join('')}
            </select>
            <input type="time" value="${meeting.start}" class="draft-start-input border border-gray-200 rounded-md text-xs p-2 bg-white" data-course-id="${course.id}" data-draft-scope="${scope}" data-meeting-id="${meeting.id}" />
            <input type="time" value="${meeting.end}" class="draft-end-input border border-gray-200 rounded-md text-xs p-2 bg-white" data-course-id="${course.id}" data-draft-scope="${scope}" data-meeting-id="${meeting.id}" />
          </div>
        </div>
      `,
    )
    .join('');
}

function renderSectionEditor(course, draft, options = {}) {
  if (!draft) return '';

  const scope = options.scope || 'add';
  const title = options.title || 'Add section option';
  const description =
    options.description ||
    'One course can include lectures, tutorials, practicals, seminars, and labs.';
  const saveLabel = options.saveLabel || 'Add Section';
  const showCancel = Boolean(options.showCancel);
  const containerClass =
    options.containerClass ||
    'bg-white p-3 rounded-lg border border-gray-200 shadow-sm mt-2';
  const saveButtonClass =
    options.saveButtonClass || 'bg-gray-900 hover:bg-gray-800';

  return `
    <div class="${containerClass}">
      <div class="flex items-center justify-between gap-3 mb-3">
        <div class="min-w-0">
          <div class="font-semibold text-gray-800 text-sm">${escapeHtml(title)}</div>
          <div class="text-xs text-gray-500">${escapeHtml(description)}</div>
        </div>
        <button class="add-draft-meeting-btn text-xs px-3 py-2 rounded-md border border-gray-200 hover:bg-gray-50 shrink-0" data-course-id="${course.id}" data-draft-scope="${scope}">+ Meeting</button>
      </div>

      <div class="grid grid-cols-2 gap-2 mb-3">
        <select class="draft-type-select border border-gray-200 rounded-md text-xs p-2 bg-gray-50" data-course-id="${course.id}" data-draft-scope="${scope}">
          ${SECTION_TYPES.map((type) => `<option value="${type}" ${type === draft.type ? 'selected' : ''}>${type}</option>`).join('')}
        </select>
        <input type="text" value="${escapeHtml(draft.label)}" placeholder="Label (e.g. LEC01)" class="draft-label-input border border-gray-200 rounded-md text-xs p-2 bg-gray-50 uppercase" data-course-id="${course.id}" data-draft-scope="${scope}" />
      </div>

      ${renderDraftMeetings(course, draft, scope)}

      <div class="flex gap-2">
        <button class="save-section-btn w-full text-white text-xs py-2 rounded-md font-medium transition-colors ${saveButtonClass}" data-course-id="${course.id}" data-draft-scope="${scope}">
          ${escapeHtml(saveLabel)}
        </button>
        ${showCancel ? `<button class="cancel-edit-btn text-xs px-3 py-2 rounded-md border border-gray-200 hover:bg-gray-50" data-course-id="${course.id}">Cancel</button>` : ''}
      </div>
    </div>
  `;
}

function renderCourses() {
  if (state.courses.length === 0) {
    DOM.courseList.innerHTML = `
      <div class="text-center py-8 text-gray-400 text-sm">
        ${renderIcon('book-open', 'text-3xl mb-2 opacity-50 block')}
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
      const cColor = COLORS[course.colorIndex % COLORS.length];
      const grouped = groupSectionsByType(course.sections);

      let contentHTML = '';

      if (course.expanded) {
        const groupedHTML = Object.entries(grouped)
          .map(
            ([type, sections]) => `
              <div class="bg-white border border-gray-200 rounded-lg p-3 shadow-sm mb-3">
                <div class="flex items-center justify-between mb-3">
                  <div>
                    <div class="font-semibold text-gray-800">${escapeHtml(type)}</div>
                    <div class="text-xs text-gray-500">Choose one of these when generating timetables</div>
                  </div>
                  <span class="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md">${sections.length}</span>
                </div>

                <div class="space-y-3">
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
                          containerClass:
                            'rounded-lg border border-blue-200 bg-blue-50/40 p-3 shadow-sm shadow-blue-100/50',
                          saveButtonClass: 'bg-blue-600 hover:bg-blue-700',
                        });
                      }

                      return `
                        <div class="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm flex justify-between items-start gap-3">
                          <div class="min-w-0">
                            <span class="font-semibold text-gray-700 block">
                              ${escapeHtml(section.label)}
                              <span class="text-gray-400 font-normal text-xs ml-1">(${escapeHtml(section.type)})</span>
                            </span>

                            ${section.meetings
                              .map(
                                (meeting) => `
                                  <div class="text-gray-500 text-xs mt-1 flex items-center gap-1">
                                    ${renderIcon('clock', 'text-[12px]')}
                                    ${meeting.day} ${meeting.start} - ${meeting.end}
                                  </div>
                                `,
                              )
                              .join('')}
                          </div>

                          <div class="flex items-center gap-1 shrink-0">
                            <button class="edit-section-btn text-gray-400 hover:text-blue-600 p-1" data-course-id="${course.id}" data-section-id="${section.id}" title="Edit section">
                              ${renderIcon('pencil-simple', 'text-lg pointer-events-none')}
                            </button>
                            <button class="delete-section-btn text-gray-400 hover:text-red-500 p-1" data-course-id="${course.id}" data-section-id="${section.id}" title="Delete section">
                              ${renderIcon('trash', 'text-lg pointer-events-none')}
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

        contentHTML = `<div class="p-4 border-t border-gray-100 bg-gray-50/50">${groupedHTML}${builderHTML}</div>`;
      }

      return `
        <div class="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm transition-all">
          <div class="px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors ${course.expanded ? 'bg-gray-50' : ''} toggle-course-btn" data-course-id="${course.id}">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-3 h-3 rounded-full ${cColor.bg} border ${cColor.border}"></div>
              <span class="font-bold text-gray-800">${escapeHtml(course.code)}</span>
              <span class="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md">${course.sections.length} sections</span>
            </div>
            <button class="delete-course-btn text-gray-400 hover:text-red-500 p-1" data-course-id="${course.id}" title="Delete course">
              ${renderIcon('trash', 'text-lg pointer-events-none')}
            </button>
          </div>
          ${contentHTML}
        </div>
      `;
    })
    .join('');
}

function renderTimetable() {
  if (state.sortedSchedules.length === 0) {
    DOM.gridColumns.innerHTML = '';
    DOM.timetableContainer.classList.add('hidden');
    return;
  }

  DOM.timetableContainer.classList.remove('hidden');
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
            colors: section.colors,
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
        const cColor = meeting.colors;
        const isCompactBlock = heightPx <= HOUR_HEIGHT + 8;
        const paddingClasses = isCompactBlock ? 'p-2 gap-0.5' : 'p-3 gap-1.5';
        const titleClasses = isCompactBlock ? 'text-xs' : 'text-sm';
        const metaClasses = isCompactBlock ? 'text-[10px]' : 'text-xs';

        return `
          <div class="absolute left-1 right-1 rounded-xl border-2 overflow-hidden shadow-sm transition-all hover:shadow-md hover:z-20 flex flex-col justify-between ${paddingClasses} ${cColor.bg} ${cColor.border} ${cColor.text}" style="top:${topPx}px; height:${heightPx}px;">
            <div class="font-bold leading-tight truncate ${titleClasses}">${escapeHtml(meeting.courseCode)}</div>
            <div class="${metaClasses} font-medium opacity-80 leading-tight truncate">${escapeHtml(meeting.label)} (${escapeHtml(meeting.type)})</div>
            <div class="text-[10px] font-semibold opacity-70 leading-tight">${minsToTime(startMins)} - ${minsToTime(endMins)}</div>
          </div>
        `;
      })
      .join('');

    columnsHTML += `<div class="flex-1 relative border-l border-gray-100 first:border-l-0 px-1" style="height:${GRID_HEIGHT}px;">${blocksHTML}</div>`;
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

function updateMainView() {
  if (!state.hasGenerated) {
    DOM.emptyState.classList.remove('hidden');
    DOM.resultsState.classList.add('hidden');
    return;
  }

  DOM.emptyState.classList.add('hidden');
  DOM.resultsState.classList.remove('hidden');
  DOM.resultsState.classList.add('flex');

  if (state.sortedSchedules.length > 0) {
    DOM.errorState.classList.add('hidden');
    DOM.scheduleStats.classList.remove('hidden');
    DOM.scheduleStats.classList.add('flex');
    DOM.paginationControls.classList.remove('hidden');
    DOM.sortControls.classList.remove('hidden');
    renderTimetable();
  } else {
    DOM.errorState.classList.remove('hidden');
    DOM.scheduleStats.classList.add('hidden');
    DOM.scheduleStats.classList.remove('flex');
    DOM.paginationControls.classList.add('hidden');
    DOM.sortControls.classList.add('hidden');
    DOM.timetableContainer.classList.add('hidden');
  }
}

function generateAlgorithm() {
  if (!canGenerateSchedules()) {
    alert('Add at least one section option to every course before generating timetables.');
    return;
  }

  const results = [];

  function walkCourses(courseIndex, selectedSections, selectedMeetings) {
    if (courseIndex === state.courses.length) {
      results.push(analyzeSchedule(clone(selectedSections)));
      return;
    }

    const course = state.courses[courseIndex];
    const grouped = groupSectionsByType(course.sections);
    const sectionTypes = Object.keys(grouped);

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
              colors: COLORS[course.colorIndex % COLORS.length],
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
  scrollResultsIntoView();
}
