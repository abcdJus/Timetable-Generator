from flask import Blueprint, request, jsonify
from app import datab
from app.models import Course, Section, Meeting

courses_tp = Blueprint('courses', __name__, url_prefix='/api')

@courses_tp.route('/courses', methods=['GET'])
def getting_courses():
    courses = Course.query.all()
    list_ofcourses = []
    for course in courses:
        list_ofcourses.append({
            'id': course.id,
            'code': course.code,
            'color_index': course.color_index
        })
    return jsonify(list_ofcourses)

@courses_tp.route('/courses', methods=['POST'])
def adding_courses():
    req_data = request.get_json()
    course = Course(code=req_data['code'], color_index=req_data.get('color_index', 0))
    datab.session.add(course)
    datab.session.commit()
    return jsonify({'id': course.id, 'code': course.code}), 201

@courses_tp.route('/courses/<int:id>', methods=['DELETE'])
def remove_course(id):
    course = Course.query.get_or_404(id)
    datab.session.delete(course)
    datab.session.commit()
    return jsonify({'message': 'Course deleted'})

@courses_tp.route('/courses/<int:id>/sections', methods=['POST'])
def adding_sections(id):
    course = Course.query.get_or_404(id)
    req_data = request.get_json()
    section = Section(
        type=req_data['type'],
        label=req_data['label'],
        course_id=course.id
    )
    datab.session.add(section)
    datab.session.commit()
    
    for meeting in req_data.get('meetings', []):
        m = Meeting(
            day=meeting['day'],
            start=meeting['start'],
            end=meeting['end'],
            section_id=section.id
        )
        datab.session.add(m)
    
    datab.session.commit()
    return jsonify({'id': section.id, 'label': section.label}), 201

@courses_tp.route('/courses/<int:id>/sections', methods=['GET'])
def getting_sections(id):
    course = Course.query.get_or_404(id)
    result = []
    for section in course.sections:
        result.append({
            'id': section.id,
            'type': section.type,
            'label': section.label,
            'meetings': [{'id': m.id, 'day': m.day, 'start': m.start, 'end': m.end} for m in section.meetings]
        })
    return jsonify(result)