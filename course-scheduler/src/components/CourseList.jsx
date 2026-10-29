import CourseCard from './CourseCard'

export default function CourseList({ courses, allCourses, getStatus, onToggle }) {
    const numberFor = id => allCourses.find(c => c.id === id).number

    return (
        <div className="course-list row g-3">
            {courses.map(course => (
                <div className="course-list_item col-12 col-md-6 col-lg-4" key={course.id}>
                    <CourseCard
                        course={course}
                        prereqNumbers={course.prerequisites.map(numberFor)}
                        status={getStatus(course)}
                        onToggle={() => onToggle(course)}
                    />
                </div>
            ))}
        </div>
    )
}