// Helper function to keep generated data, saved state, and rendered UI in sync after course changes
function refreshAfterCourseChange() {
  resetGeneratedState();
  saveState();
  renderCourses();
  updateMainView();
}

// Handles adding a new course from the sidebar form.
DOM.addCourseForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const code = DOM.courseCodeInput.value.trim().toUpperCase();
  if (!code) return;

  if (state.courses.some((course) => course.code === code)) {
    alert(`Course "${code}" has already been added.`);
    return;
  }

  state.courses.forEach((course) => {
    course.expanded = false;
  });

  const newCourse = createCourse(
    code,
    state.courses.length % COLORS.length,
    [],
  );
  newCourse.expanded = true;
  state.courses.push(newCourse);
  DOM.courseCodeInput.value = '';
  refreshAfterCourseChange();
});

// Handles all button clicks inside the course list using event delegation.
DOM.courseList.addEventListener('click', (e) => {
  const button = e.target.closest('button');
  const toggle = e.target.closest('.toggle-course-btn');

  if (button) {
    const courseId = button.getAttribute('data-course-id');
    const course = getCourse(courseId);

    if (button.classList.contains('delete-course-btn')) {
      e.stopPropagation();
      state.courses = state.courses.filter((c) => c.id !== courseId);
      refreshAfterCourseChange();
      return;
    }

    if (!course) return;

    if (button.classList.contains('delete-section-btn')) {
      e.stopPropagation();
      const sectionId = button.getAttribute('data-section-id');
      course.sections = course.sections.filter(
        (section) => section.id !== sectionId,
      );

      if (course.editingSectionId === sectionId) {
        stopEditingSection(course);
      }

      refreshAfterCourseChange();
      return;
    }

    if (button.classList.contains('edit-section-btn')) {
      e.stopPropagation();
      const sectionId = button.getAttribute('data-section-id');
      const section = course.sections.find((s) => s.id === sectionId);
      if (!section) return;
      startEditingSection(course, section);
      renderCourses();
      return;
    }

    if (button.classList.contains('cancel-edit-btn')) {
      e.stopPropagation();
      stopEditingSection(course);
      renderCourses();
      return;
    }

    if (button.classList.contains('add-draft-meeting-btn')) {
      e.stopPropagation();
      const scope = button.getAttribute('data-draft-scope') || 'add';
      const draft = getDraftSection(course, scope);
      if (!draft) return;
      draft.meetings.push(createMeeting());
      renderCourses();
      return;
    }

    if (button.classList.contains('remove-draft-meeting-btn')) {
      e.stopPropagation();
      const scope = button.getAttribute('data-draft-scope') || 'add';
      const draft = getDraftSection(course, scope);
      if (!draft || draft.meetings.length === 1) return;
      const meetingId = button.getAttribute('data-meeting-id');
      draft.meetings = draft.meetings.filter(
        (meeting) => meeting.id !== meetingId,
      );
      renderCourses();
      return;
    }

    if (button.classList.contains('save-section-btn')) {
      e.stopPropagation();
      const scope = button.getAttribute('data-draft-scope') || 'add';
      const draft = getDraftSection(course, scope);
      if (!draft) return;
      const cleanLabel = draft.label.trim().toUpperCase();
      const duplicateSection = course.sections.find((section) => {
        if (scope === 'edit' && section.id === course.editingSectionId) {
          return false;
        }

        return section.label.trim().toUpperCase() === cleanLabel;
      });

      if (!cleanLabel) {
        alert('Please enter a section label.');
        return;
      }

      if (duplicateSection) {
        alert(
          `Section label "${cleanLabel}" already exists in ${course.code}. Please use a different label.`,
        );
        return;
      }

      if (!validateMeetings(draft.meetings)) {
        alert(
          'Please enter valid meeting times. End time must be after start time, and meetings inside the same section cannot overlap.',
        );
        return;
      }

      const savedSection = {
        id:
          scope === 'edit' && course.editingSectionId
            ? course.editingSectionId
            : generateId(),
        type: draft.type,
        label: cleanLabel,
        meetings: clone(draft.meetings),
      };

      if (scope === 'edit' && course.editingSectionId) {
        course.sections = course.sections.map((section) =>
          section.id === course.editingSectionId ? savedSection : section,
        );
        stopEditingSection(course);
      } else {
        course.sections.push(savedSection);
        course.draftSection = createDraftSection(draft.type);
      }

      refreshAfterCourseChange();
      return;
    }
  }

  if (toggle && !button) {
    const courseId = toggle.getAttribute('data-course-id');

    state.courses.forEach((course) => {
      if (course.id === courseId) {
        course.expanded = !course.expanded;
      } else {
        course.expanded = false;
      }
    });

    renderCourses();
  }
});

// Updates draft text/time inputs as the user types.
DOM.courseList.addEventListener('input', (e) => {
  const target = e.target;
  const courseId = target.getAttribute('data-course-id');
  if (!courseId) return;

  const course = getCourse(courseId);
  if (!course) return;

  const scope = target.getAttribute('data-draft-scope') || 'add';
  const draft = getDraftSection(course, scope);
  if (!draft) return;

  if (target.classList.contains('draft-label-input')) {
    draft.label = target.value.toUpperCase();
    return;
  }

  if (target.classList.contains('draft-start-input')) {
    const meeting = getDraftMeeting(
      course,
      target.getAttribute('data-meeting-id'),
      scope,
    );
    if (meeting) meeting.start = target.value;
    return;
  }

  if (target.classList.contains('draft-end-input')) {
    const meeting = getDraftMeeting(
      course,
      target.getAttribute('data-meeting-id'),
      scope,
    );
    if (meeting) meeting.end = target.value;
  }
});

// Updates draft dropdown values after the user changes them.
DOM.courseList.addEventListener('change', (e) => {
  const target = e.target;
  const courseId = target.getAttribute('data-course-id');
  if (!courseId) return;

  const course = getCourse(courseId);
  if (!course) return;

  const scope = target.getAttribute('data-draft-scope') || 'add';
  const draft = getDraftSection(course, scope);
  if (!draft) return;

  if (target.classList.contains('draft-type-select')) {
    draft.type = target.value;
    return;
  }

  if (target.classList.contains('draft-day-select')) {
    const meeting = getDraftMeeting(
      course,
      target.getAttribute('data-meeting-id'),
      scope,
    );
    if (meeting) meeting.day = target.value;
  }
});

// Starts timetable generation when the main action button is pressed.
DOM.generateBtn.addEventListener('click', generateAlgorithm);

// Replaces the current course list with the demo sample data.
DOM.resetBtn.addEventListener('click', () => {
  state.courses = buildSampleCourses();
  refreshAfterCourseChange();
});

// Moves to the previous generated timetable option.
DOM.prevBtn.addEventListener('click', () => {
  if (state.currentIndex > 0) {
    state.currentIndex -= 1;
    renderTimetable();
  }
});

// Moves to the next generated timetable option.
DOM.nextBtn.addEventListener('click', () => {
  if (state.currentIndex < state.sortedSchedules.length - 1) {
    state.currentIndex += 1;
    renderTimetable();
  }
});

// Re-sorts the generated results when the user changes the dropdown.
DOM.sortSelect.addEventListener('change', (e) => {
  state.sortBy = e.target.value;
  sortSchedules();
  if (state.hasGenerated) updateMainView();
  saveState();
});

// Logs the user out from the timetable page and prevents double-clicks while it runs.
if (DOM.logoutBtn) {
  DOM.logoutBtn.addEventListener('click', async () => {
    if (DOM.logoutBtn.disabled) return;

    const originalLabel = DOM.logoutBtn.textContent;
    DOM.logoutBtn.disabled = true;
    DOM.logoutBtn.textContent = 'Logging out...';

    try {
      await logoutUser();
    } finally {
      if (!authRedirectInProgress) {
        DOM.logoutBtn.disabled = false;
        DOM.logoutBtn.textContent = originalLabel;
      }
    }
  });
}
