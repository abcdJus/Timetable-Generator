from flask import Blueprint, request, jsonify

schedules_tp = Blueprint('schedules', __name__, url_prefix='/api')

@schedules_tp.route('/generate', methods=['POST'])
def gen_tables():
    req_data = request.get_json()
    courses = req_data.get('courses', [])

    all_results = []

    def time_in_minutes(t):
        parts = t.split(':')
        hours = int(parts[0])
        minutes = int(parts[1])
        return hours * 60 + minutes

    def checks_alloverlaps(a, b):
        if a['day'] != b['day']:
            return False
        a_start = time_in_minutes(a['start'])
        a_end = time_in_minutes(a['end'])
        b_start = time_in_minutes(b['start'])
        b_end = time_in_minutes(b['end'])
        return a_start < b_end and b_start < a_end

    def check_allconflicts(section, selected_meetings):
        return any(checks_alloverlaps(m, s) for m in section['meetings'] for s in selected_meetings)

    def generate_schedules(course_index, selected, selected_meetings):
        if course_index == len(courses):
            all_results.append(selected[:])
            return
        course = courses[course_index]
        for section in course['sections']:
            if not check_allconflicts(section, selected_meetings):
                selected.append({**section, 'course_code': course['code']})
                generate_schedules(course_index + 1, selected, selected_meetings + section['meetings'])
                selected.pop()

    generate_schedules(0, [], [])
    return jsonify(all_results)

