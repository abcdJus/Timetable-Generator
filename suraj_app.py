from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
from flask_cors import CORS
import sqlite3

app = Flask(__name__)
app.config['SECRET_KEY'] = 'timetable_generator_secret_key'
CORS(app, supports_credentials=True, origins=['http://127.0.0.1:5000'])
db = 'timetable_generator.db'

# set up database
conn = sqlite3.connect(db)
conn.execute('''
    CREATE TABLE IF NOT EXISTS user (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
    )
''')
conn.execute('''
    CREATE TABLE IF NOT EXISTS courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        code TEXT NOT NULL,
        color_index INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES user(id)
    )
''')
conn.execute('''
    CREATE TABLE IF NOT EXISTS sections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        label TEXT NOT NULL,
        FOREIGN KEY (course_id) REFERENCES courses(id)
    )
''')
conn.execute('''
    CREATE TABLE IF NOT EXISTS meetings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        section_id INTEGER NOT NULL,
        day TEXT NOT NULL,
        start TEXT NOT NULL,
        end TEXT NOT NULL,
        FOREIGN KEY (section_id) REFERENCES sections(id)
    )
''')
conn.commit()
conn.close()

# on opening web application it redirects to login page
@app.route('/')
def home():
    return redirect(url_for('login'))

# login logic
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        conn = sqlite3.connect(db)
        user = conn.execute("SELECT * FROM user WHERE username = ?", (username,)).fetchone()
        conn.close()

        if not user:
            flash("Your email does not appear to be registered. Please register!.")
            return redirect(url_for('login'))
        if user[2] != password:
            flash("Incorrect password.")
            return redirect(url_for('login'))

        session['username'] = username
        session['user_id'] = user[0]
        return redirect(url_for('index'))
    return render_template('login.html')

# register logic
@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        confirm = request.form['confirm_password']

        if password != confirm:
            flash("Passwords don't match.")
            return redirect(url_for('register'))

        conn = sqlite3.connect(db)
        existing = conn.execute("SELECT * FROM user WHERE username = ?", (username,)).fetchone()
        if existing:
            flash("Your email is already in use. Please choose a different one.")
            conn.close()
            return redirect(url_for('register'))

        conn.execute("INSERT INTO user (username, password) VALUES (?, ?)", (username, password))
        conn.commit()
        conn.close()

        flash("Account created! Please log in.")
        return redirect(url_for('login'))
    return render_template('register.html')

# redirect users to actual timetable builder
@app.route('/index')
def index():
    if 'username' not in session:
        return redirect(url_for('login'))
    return render_template('index.html')

# logout logic
@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

# get all courses for logged in user
@app.route('/api/courses', methods=['GET'])
def get_courses():
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in'}), 401
    conn = sqlite3.connect(db)
    courses = conn.execute("SELECT * FROM courses WHERE user_id = ?", (session['user_id'],)).fetchall()
    conn.close()
    return jsonify([{'id': c[0], 'code': c[2], 'color_index': c[3]} for c in courses])

# save all courses for logged in user
@app.route('/api/courses', methods=['POST'])
def save_courses():
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in'}), 401
    req_data = request.get_json()
    conn = sqlite3.connect(db)
    conn.execute("DELETE FROM courses WHERE user_id = ?", (session['user_id'],))
    for course in req_data.get('courses', []):
        cursor = conn.execute("INSERT INTO courses (user_id, code, color_index) VALUES (?, ?, ?)",
                              (session['user_id'], course['code'], course.get('colorIndex', 0)))
        course_id = cursor.lastrowid
        for section in course.get('sections', []):
            sec = conn.execute("INSERT INTO sections (course_id, type, label) VALUES (?, ?, ?)",
                               (course_id, section['type'], section['label']))
            section_id = sec.lastrowid
            for meeting in section.get('meetings', []):
                conn.execute("INSERT INTO meetings (section_id, day, start, end) VALUES (?, ?, ?, ?)",
                             (section_id, meeting['day'], meeting['start'], meeting['end']))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Saved!'})

# get sections for a course
@app.route('/api/courses/<int:course_id>/sections', methods=['GET'])
def get_sections(course_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in'}), 401
    conn = sqlite3.connect(db)
    sections = conn.execute("SELECT * FROM sections WHERE course_id = ?", (course_id,)).fetchall()
    result = []
    for section in sections:
        meetings = conn.execute("SELECT * FROM meetings WHERE section_id = ?", (section[0],)).fetchall()
        result.append({
            'id': section[0],
            'type': section[2],
            'label': section[3],
            'meetings': [{'id': m[0], 'day': m[2], 'start': m[3], 'end': m[4]} for m in meetings]
        })
    conn.close()
    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True)