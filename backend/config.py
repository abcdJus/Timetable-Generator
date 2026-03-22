import os

class Config:
    SECRET_KEY = "timetable-gen-2026"
    SQLALCHEMY_DATABASE_URI = "sqlite:///timetablegen.db"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
