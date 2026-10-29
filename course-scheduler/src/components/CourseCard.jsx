export default function CourseCard({ course, prereqNumbers, status, onToggle }) {
    const state = status.toLowerCase() // "completed", "available", or "locked"

    return (
        <div className={`course-card course-card--${state} card h-100`}>
            <div className="course-card_body">
                <div className="course-card_header">
                    <h5 className="course-card_title">
                        {course.number}: {course.title}
                    </h5>
                    <span className={`course-card_badge course-card_badge--${state} badge`}>
                        {status}
                    </span>
                </div>
                <h6 className="course-card_credits">{course.credits} credits</h6>
                <p className="course-card_description">{course.description}</p>
                <p className="course-card_prereqs">
                    <strong>Prerequisites:</strong>{' '}
                    {prereqNumbers.length ? prereqNumbers.join(', ') : 'None'}
                </p>
                <div className="course-card_toggle form-check">
                    <input
                        className="course-card_checkbox form-check-input"
                        type="checkbox"
                        id={`course-${course.id}`}
                        checked={status === 'Completed'}
                        disabled={status === 'Locked'}
                        onChange={onToggle}
                    />
                    <label className="course-card_label form-check-label" htmlFor={`course-${course.id}`}>
                        Completed
                    </label>
                </div>
            </div>
        </div>
    )
}