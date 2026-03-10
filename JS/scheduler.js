function groupSectionsByType(sections) {
  return sections.reduce((acc, section) => {
    if (!acc[section.type]) acc[section.type] = [];
    acc[section.type].push(section);
    return acc;
  }, {});
}

function meetingsOverlap(a, b) {
  if (a.day !== b.day) return false;
  return (
    Math.max(timeToMins(a.start), timeToMins(b.start)) <
    Math.min(timeToMins(a.end), timeToMins(b.end))
  );
}

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

function sectionConflictsWithMeetings(section, selectedMeetings) {
  return section.meetings.some((meeting) =>
    selectedMeetings.some((existing) => meetingsOverlap(meeting, existing)),
  );
}

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
