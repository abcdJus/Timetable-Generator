function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderIcon(name, classes = '') {
  const className = ['icon', classes].filter(Boolean).join(' ');
  return '<svg class="' + className + '" aria-hidden="true"><use href="#icon-' + name + '"></use></svg>';
}

function normalizeTimeValue(value, fallback) {
  if (typeof value !== 'string') return fallback;

  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return fallback;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return fallback;
  }

  return String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0');
}

function createMeeting(day = DAYS[0], start = '09:00', end = '10:00') {
  return {
    id: generateId(),
    day: DAYS.includes(day) ? day : DAYS[0],
    start: normalizeTimeValue(start, '09:00'),
    end: normalizeTimeValue(end, '10:00'),
  };
}

function normalizeMeeting(meeting = {}) {
  return {
    id: meeting.id || generateId(),
    day: DAYS.includes(meeting.day) ? meeting.day : DAYS[0],
    start: normalizeTimeValue(meeting.start, '09:00'),
    end: normalizeTimeValue(meeting.end, '10:00'),
  };
}

function createDraftSection(type = 'Lecture') {
  return {
    type: SECTION_TYPES.includes(type) ? type : 'Lecture',
    label: '',
    meetings: [createMeeting()],
  };
}

function createCourse(code, colorIndex = 0, sections = []) {
  const normalizedSections = Array.isArray(sections)
    ? sections.map((section) => normalizeSection(section))
    : [];

  return {
    id: generateId(),
    code: String(code || '').trim().toUpperCase(),
    colorIndex: Number.isInteger(colorIndex) ? colorIndex : 0,
    expanded: false,
    sections: normalizedSections,
    draftSection: createDraftSection(normalizedSections[0]?.type || 'Lecture'),
    editingSectionId: null,
    editingDraftSection: null,
  };
}

function timeToMins(time = '00:00') {
  const normalized = normalizeTimeValue(time, '00:00');
  const [hours, minutes] = normalized.split(':').map(Number);
  return hours * 60 + minutes;
}

function minsToTime(totalMinutes = 0) {
  const safeMinutes = Math.max(0, Math.floor(Number(totalMinutes) || 0));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  return hours + ':' + String(minutes).padStart(2, '0');
}
