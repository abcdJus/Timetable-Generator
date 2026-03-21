from app import datab

class Course(datab.Model):
    id = datab.Column(datab.Integer, primary_key=True)
    code = datab.Column(datab.String(20), nullable=False)
    color_index = datab.Column(datab.Integer, default=0)
    sections = datab.relationship('Section', backref='course', cascade='all, delete-orphan')

class Section(datab.Model):
    id = datab.Column(datab.Integer, primary_key=True)
    type = datab.Column(datab.String(20), nullable=False)
    label = datab.Column(datab.String(20), nullable=False)
    course_id = datab.Column(datab.Integer, datab.ForeignKey('course.id'), nullable=False)
    meetings = datab.relationship('Meeting', backref='section', cascade='all, delete-orphan')

class Meeting(datab.Model):
    id = datab.Column(datab.Integer, primary_key=True)
    day = datab.Column(datab.String(10), nullable=False)
    start = datab.Column(datab.String(10), nullable=False)
    end = datab.Column(datab.String(10), nullable=False)
    section_id = datab.Column(datab.Integer, datab.ForeignKey('section.id'), nullable=False)