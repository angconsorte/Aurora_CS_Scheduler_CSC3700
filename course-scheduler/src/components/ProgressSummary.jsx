export default function ProgressSummary({ total, completed, available, locked }) {
    return (
        <div className="progress-summary alert alert-light border d-flex flex-wrap gap-3">
            <span><strong>{completed}</strong> of {total} courses completed</span>
            <span className="badge course-card_badge--available align-self-center">{available} available</span>
            <span className="badge course-card_badge--locked align-self-center">{locked} locked</span>
        </div>
    )
}
