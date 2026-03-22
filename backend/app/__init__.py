from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS

datab = SQLAlchemy()

def builder_app():
    timetable_app = Flask(__name__)
    timetable_app.config.from_object('config.Config')
    
    datab.init_app(timetable_app)
    CORS(timetable_app)
    
    from app.routes.courses import courses_tp
    timetable_app.register_blueprint(courses_tp)
    
    from app.routes.schedules import schedules_tp
    timetable_app.register_blueprint(schedules_tp)

    with timetable_app.app_context():
        datab.create_all()
    
    return timetable_app