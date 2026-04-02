import sqlite3

from flask import Flask, redirect, render_template, request, session, url_for

app = Flask(__name__)
app.secret_key = 'timetable_generator_secret_key'
db = 'timetable_generator.db'
VALID_DAYS = {'Mon', 'Tue', 'Wed', 'Thu', 'Fri'}
VALID_SECTION_TYPES = {'Lecture', 'Tutorial', 'Practical', 'Seminar', 'Lab'}


# Open a SQLite connection with row access and foreign-key enforcement enabled.
def get_db_connection():
    conn = sqlite3.connect(db)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA foreign_keys = ON')
    return conn


# Create the tables the app needs if they do not already exist.
def init_db():
    conn = get_db_connection()
    conn.executescript(
        '''
        CREATE TABLE IF NOT EXISTS user (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS courses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            code TEXT NOT NULL,
            color_index INTEGER DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS sections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            course_id INTEGER NOT NULL,
            type TEXT NOT NULL,
            label TEXT NOT NULL,
            FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS meetings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            section_id INTEGER NOT NULL,
            day TEXT NOT NULL,
            start TEXT NOT NULL,
            end TEXT NOT NULL,
            FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE
        );
        '''
    )
    conn.commit()
    conn.close()


# Delete one user's saved courses and all related child records.
def clear_saved_courses(conn, user_id):
    # Child rows are removed automatically because the tables use ON DELETE CASCADE.
    conn.execute('DELETE FROM courses WHERE user_id = ?', (user_id,))


# Builds the one-time message shown on the login or register page after a redirect.
def build_page_message():
    return {
        'message': request.args.get('message'),
        'message_type': request.args.get('message_type', 'error'),
    }


# Converts an HH:MM string into total minutes and returns None when invalid.
def time_to_minutes(value):
    if not isinstance(value, str):
        return None

    parts = value.split(':')
    if len(parts) != 2 or not parts[0].isdigit() or not parts[1].isdigit():
        return None

    hours = int(parts[0])
    minutes = int(parts[1])
    if hours < 0 or hours > 23 or minutes < 0 or minutes > 59:
        return None

    return hours * 60 + minutes


# Returns True when two meetings happen on the same day and overlap in time.
def meetings_overlap(first_meeting, second_meeting):
    if first_meeting['day'] != second_meeting['day']:
        return False

    return (
        max(first_meeting['start_minutes'], second_meeting['start_minutes']) <
        min(first_meeting['end_minutes'], second_meeting['end_minutes'])
    )


# Checks that each course payload uses valid course, section, and meeting data.
def validate_course_payload(courses):
    if not isinstance(courses, list):
        return 'Courses payload must be a list.'

    seen_course_codes = set()

    for course in courses:
        if not isinstance(course, dict):
            return 'Each course must be an object.'

        course_code = str(course.get('code', '')).strip().upper()
        if not course_code:
            return 'Every course needs a code.'
        if course_code in seen_course_codes:
            return f'Course "{course_code}" has been added more than once.'

        sections = course.get('sections', [])
        if not isinstance(sections, list):
            return f'Sections for {course_code} must be a list.'

        seen_labels = set()

        for section in sections:
            if not isinstance(section, dict):
                return f'Each section in {course_code} must be an object.'

            section_type = str(section.get('type', '')).strip()
            label = str(section.get('label', '')).strip().upper()
            meetings = section.get('meetings', [])

            if not section_type:
                return f'Every section in {course_code} needs a type.'
            if section_type not in VALID_SECTION_TYPES:
                return (
                    f'Section "{label or "unknown"}" in {course_code} uses '
                    'an invalid section type.'
                )
            if not label:
                return 'Every section needs a label.'
            if label in seen_labels:
                return f'Duplicate section label "{label}" found in {course_code}.'
            if not isinstance(meetings, list) or not meetings:
                return f'Section "{label}" in {course_code} needs at least one meeting.'

            normalized_meetings = []
            for meeting in meetings:
                if not isinstance(meeting, dict):
                    return f'Each meeting in section "{label}" must be an object.'

                day = str(meeting.get('day', '')).strip()
                start = str(meeting.get('start', '')).strip()
                end = str(meeting.get('end', '')).strip()
                if not day or not start or not end:
                    return f'Each meeting in section "{label}" needs a day, start time, and end time.'
                if day not in VALID_DAYS:
                    return f'Meeting day "{day}" in section "{label}" is invalid.'

                start_minutes = time_to_minutes(start)
                end_minutes = time_to_minutes(end)
                if start_minutes is None or end_minutes is None:
                    return f'Meeting times in section "{label}" must use HH:MM format.'
                if start_minutes >= end_minutes:
                    return f'Each meeting in section "{label}" must end after it starts.'

                normalized_meetings.append({
                    'day': day,
                    'start_minutes': start_minutes,
                    'end_minutes': end_minutes,
                })

            for meeting_index, current_meeting in enumerate(normalized_meetings):
                for other_meeting in normalized_meetings[meeting_index + 1:]:
                    if meetings_overlap(current_meeting, other_meeting):
                        return (
                            f'Meetings in section "{label}" cannot overlap each other.'
                        )

            seen_labels.add(label)
        seen_course_codes.add(course_code)

    return None


init_db()

# Redirect the root URL to the login screen.
@app.route('/')
def home():
    return redirect(url_for('login'))

# Show the login page and create a session when credentials match.
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        conn = get_db_connection()
        user = conn.execute(
            'SELECT * FROM user WHERE username = ?',
            (username,),
        ).fetchone()
        conn.close()

        if not user:
            return redirect(
                url_for(
                    'login',
                    message='Your email does not appear to be registered. Please register!',
                    message_type='error',
                )
            )
        if user['password'] != password:
            return redirect(
                url_for(
                    'login',
                    message='Incorrect password.',
                    message_type='error',
                )
            )

        session['username'] = username
        session['user_id'] = user['id']
        return redirect(url_for('index'))
    return render_template('login.html', **build_page_message())

# Show the registration form and create a new user account.
@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        confirm = request.form['confirm_password']

        if password != confirm:
            return redirect(
                url_for(
                    'register',
                    message="Passwords don't match.",
                    message_type='error',
                )
            )

        conn = get_db_connection()
        existing = conn.execute(
            'SELECT * FROM user WHERE username = ?',
            (username,),
        ).fetchone()
        if existing:
            conn.close()
            return redirect(
                url_for(
                    'register',
                    message='Your email is already in use. Please choose a different one.',
                    message_type='error',
                )
            )

        conn.execute(
            'INSERT INTO user (username, password) VALUES (?, ?)',
            (username, password),
        )
        conn.commit()
        conn.close()

        return redirect(
            url_for(
                'login',
                message='Account created! Please log in.',
                message_type='success',
            )
        )
    return render_template('register.html', **build_page_message())

# Render the timetable builder for signed-in users only.
@app.route('/index')
def index():
    if 'username' not in session:
        return redirect(url_for('login'))
    return render_template('index.html')

# Clear the current session and send the user back to login.
@app.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return {'message': 'Logged out', 'redirect_url': url_for('login')}

# Return the signed-in user's saved courses.
@app.route('/api/courses', methods=['GET'])
def get_courses():
    if 'user_id' not in session:
        return {'error': 'Not logged in'}, 401
    conn = get_db_connection()
    courses = conn.execute(
        'SELECT * FROM courses WHERE user_id = ?',
        (session['user_id'],),
    ).fetchall()
    conn.close()
    return [
        {'id': c['id'], 'code': c['code'], 'color_index': c['color_index']}
        for c in courses
    ]

# Replace the signed-in user's saved timetable data with the latest version.
@app.route('/api/courses', methods=['POST'])
def save_courses():
    if 'user_id' not in session:
        return {'error': 'Not logged in'}, 401
    req_data = request.get_json(silent=True)
    if not isinstance(req_data, dict):
        return {'error': 'Request body must be a JSON object.'}, 400

    courses = req_data.get('courses', [])
    error_message = validate_course_payload(courses)
    if error_message:
        return {'error': error_message}, 400

    conn = get_db_connection()
    clear_saved_courses(conn, session['user_id'])

    for course in courses:
        cursor = conn.execute(
            'INSERT INTO courses (user_id, code, color_index) VALUES (?, ?, ?)',
            (
                session['user_id'],
                str(course.get('code', '')).strip().upper(),
                course.get('colorIndex', 0),
            ),
        )
        course_id = cursor.lastrowid
        for section in course.get('sections', []):
            section_label = str(section.get('label', '')).strip().upper()
            sec = conn.execute(
                'INSERT INTO sections (course_id, type, label) VALUES (?, ?, ?)',
                (course_id, section['type'], section_label),
            )
            section_id = sec.lastrowid
            for meeting in section.get('meetings', []):
                conn.execute(
                    'INSERT INTO meetings (section_id, day, start, end) VALUES (?, ?, ?, ?)',
                    (section_id, meeting['day'], meeting['start'], meeting['end']),
                )
    conn.commit()
    conn.close()
    return {'message': 'Saved!'}

# Return sections only when the requested course belongs to the current user.
@app.route('/api/courses/<int:course_id>/sections', methods=['GET'])
def get_sections(course_id):
    if 'user_id' not in session:
        return {'error': 'Not logged in'}, 401

    conn = get_db_connection()
    owned_course = conn.execute(
        'SELECT id FROM courses WHERE id = ? AND user_id = ?',
        (course_id, session['user_id']),
    ).fetchone()
    if not owned_course:
        conn.close()
        return {'error': 'Course not found'}, 404

    sections = conn.execute(
        'SELECT * FROM sections WHERE course_id = ?',
        (course_id,),
    ).fetchall()
    result = []
    for section in sections:
        meetings = conn.execute(
            'SELECT * FROM meetings WHERE section_id = ?',
            (section['id'],),
        ).fetchall()
        result.append({
            'id': section['id'],
            'type': section['type'],
            'label': section['label'],
            'meetings': [
                {'id': m['id'], 'day': m['day'], 'start': m['start'], 'end': m['end']}
                for m in meetings
            ],
        })
    conn.close()
    return result

if __name__ == '__main__':
    app.run(debug=True)
