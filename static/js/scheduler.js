// Groups a course's sections by type so generation can pick one lecture, one lab, and so on.
function groupSectionsByType(sections) {
  return sections.reduce((acc, section) => {
    if (!acc[section.type]) acc[section.type] = [];
    acc[section.type].push(section);
    return acc;
  }, {});
}

// Returns true when two meetings happen on the same day and overlap in time.
function meetingsOverlap(a, b) {
  if (a.day !== b.day) return false;
  return (
    Math.max(timeToMins(a.start), timeToMins(b.start)) <
    Math.min(timeToMins(a.end), timeToMins(b.end))
  );
}

// Checks that each meeting is complete, ordered correctly, and does not overlap itself.
function validateMeetings(meetings) {
  if (!meetings.length) return false;

  for (const meeting of meetings) {
    if (!meeting.day || !meeting.start || !meeting.end) return false;
    if (timeToMins(meeting.start) >= timeToMins(meeting.end)) return false;
  }

  for (let i = 0; i < meetings.length; i++) {
    for (let j = i + 1; j < meetings.length; j++) {
      if (meetingsOverlap(meetings[i], meetings[j])) return false;
    }
  }

  return true;
}

// Checks whether a section conflicts with meetings that are already selected.
function sectionConflictsWithMeetings(section, selectedMeetings) {
  return section.meetings.some((meeting) =>
    selectedMeetings.some((existing) => meetingsOverlap(meeting, existing)),
  );
}

// Measures how much idle time exists between classes across the week.
function scheduleCompactness(selections) {
  const byDay = Object.fromEntries(DAYS.map((day) => [day, []]));
  selections.forEach((section) => {
    section.meetings.forEach((meeting) => {
      byDay[meeting.day].push(meeting);
    });
  });

  let idle = 0;
  for (const day of DAYS) {
    const meetings = byDay[day]
      .map((m) => ({ start: timeToMins(m.start), end: timeToMins(m.end) }))
      .sort((a, b) => a.start - b.start);

    for (let i = 1; i < meetings.length; i++) {
      idle += Math.max(0, meetings[i].start - meetings[i - 1].end);
    }
  }

  return idle;
}

// Calculates summary stats used for sorting and displaying one generated schedule.
function analyzeSchedule(selections) {
  const usedDays = new Set();
  let earliestStart = 24 * 60;
  let latestEnd = 0;

  selections.forEach((section) => {
    section.meetings.forEach((meeting) => {
      const start = timeToMins(meeting.start);
      const end = timeToMins(meeting.end);
      usedDays.add(meeting.day);
      earliestStart = Math.min(earliestStart, start);
      latestEnd = Math.max(latestEnd, end);
    });
  });

  return {
    selections,
    daysCount: usedDays.size,
    earliestStart,
    latestEnd,
    compactness: scheduleCompactness(selections),
  };
}

// Sorts generated schedules according to the current dropdown choice.
function sortSchedules() {

  const sorted = [...state.generatedSchedules];

  if (state.sortBy === 'fewer-days') {
    sorted.sort(
      (a, b) => a.daysCount - b.daysCount || a.earliestStart - b.earliestStart,
    );
  } else if (state.sortBy === 'earliest-finish') {
    sorted.sort(
      (a, b) => a.latestEnd - b.latestEnd || a.daysCount - b.daysCount,
    );
  } else if (state.sortBy === 'latest-start') {
    sorted.sort(
      (a, b) => b.earliestStart - a.earliestStart || a.daysCount - b.daysCount,
    );
  } else if (state.sortBy === 'compact') {
    sorted.sort(
      (a, b) => a.compactness - b.compactness || a.daysCount - b.daysCount,
    );
  }

  state.sortedSchedules = sorted;
  state.currentIndex = 0; 
}
