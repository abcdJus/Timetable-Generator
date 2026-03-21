from flask import Flask, render_template, request, redirect, url_for, session, flash
import sqlite3
 
app = Flask(__name__)
app.config['SECRET_KEY'] = 'timetable_generator_secret_key'
db = 'timetable_generator.db'

#set up database
conn = sqlite3.connect(db)
conn.execute('''
    CREATE TABLE IF NOT EXISTS user (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
    )
    ''')
conn.commit()
conn.close()

#on opening web application it redirects to login page
@app.route('/')
def home():
    return redirect(url_for('login'))
#login logic
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
        return redirect(url_for('index'))
    return render_template('login.html')
#register logic
@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        confirm  = request.form['confirm_password']
 
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

#redirect users to actual timetable builder
@app.route('/index')
def index():
    if 'username' not in session:
        return redirect(url_for('login'))
    return render_template('index.html')
#logout logic
@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))
 
if __name__ == '__main__':
    app.run(debug=True)
