DOM.addCourseForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const code = DOM.courseCodeInput.value.trim().toUpperCase();
  if (!code) return;

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
  resetGeneratedState();
  saveState();
  renderCourses();
  updateMainView();
});

DOM.courseList.addEventListener('click', (e) => {
  const button = e.target.closest('button');
  const toggle = e.target.closest('.toggle-course-btn');

  if (button) {
    const courseId = button.getAttribute('data-course-id');
    const course = getCourse(courseId);

    if (button.classList.contains('delete-course-btn')) {
      e.stopPropagation();
      state.courses = state.courses.filter((c) => c.id !== courseId);
      resetGeneratedState();
      saveState();
      renderCourses();
      updateMainView();
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

      resetGeneratedState();
      saveState();
      renderCourses();
      updateMainView();
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

      if (!cleanLabel) {
        alert('Please enter a section label.');
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

      resetGeneratedState();
      saveState();
      renderCourses();
      updateMainView();
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

DOM.generateBtn.addEventListener('click', generateAlgorithm);

DOM.resetBtn.addEventListener('click', () => {
  state.courses = buildSampleCourses();
  resetGeneratedState();
  saveState();
  renderCourses();
  updateMainView();
});

DOM.prevBtn.addEventListener('click', () => {
  if (state.currentIndex > 0) {
    state.currentIndex -= 1;
    renderTimetable();
  }
});

DOM.nextBtn.addEventListener('click', () => {
  if (state.currentIndex < state.sortedSchedules.length - 1) {
    state.currentIndex += 1;
    renderTimetable();
  }
});

DOM.sortSelect.addEventListener('change', (e) => {
  state.sortBy = e.target.value;
  sortSchedules();
  if (state.hasGenerated) updateMainView();
  saveState();
});
