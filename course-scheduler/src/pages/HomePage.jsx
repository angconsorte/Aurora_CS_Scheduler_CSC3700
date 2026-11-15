import { useState, useEffect } from 'react'
import useFetch from '../hooks/useFetch'
import CourseList from '../components/CourseList'
import ProgressSummary from '../components/ProgressSummary'


export default function HomePage() {
    const { data, isPending: coursesPending, error: coursesError } = useFetch('/api/courses')
    const { data: savedCompletions, isPending: completionsPending, error: completionsError } =
        useFetch('/api/completions')
    const isPending = coursesPending || completionsPending
    const error = coursesError || completionsError

    const courses = data
        ? data.map(c => ({
            ...c,
            id: Number(c.id),
            prerequisites: c.prerequisites.map(Number),
        }))
        : null
    const [completed, setCompleted] = useState([])
    const [filter, setFilter] = useState('all')
    const [message, setMessage] = useState(null) // { ok: true/false, text: '...' }

    // When the fetch finishes, copy the server's list into editable state
    useEffect(() => {
        if (Array.isArray(savedCompletions)) setCompleted(savedCompletions.map(Number))
    }, [savedCompletions])

    const isAvailable = (course, done) =>
        course.prerequisites.every(id => done.includes(id))

    const getStatus = course => {
        if (completed.includes(course.id)) return 'Completed'
        return isAvailable(course, completed) ? 'Available' : 'Locked'
    }

    const updateCompleted = next => {
        setCompleted(next)
        setSaved(false)
    }

    const toggleCourse = course => {
        if (completed.includes(course.id)) {
            let next = completed.filter(id => id !== course.id)
            let changed = true
            while (changed) {
                const kept = next.filter(id =>
                    isAvailable(courses.find(c => c.id === id), next)
                )
                changed = kept.length !== next.length
                next = kept
            }
            updateCompleted(next)
        } else if (isAvailable(course, completed)) {
            updateCompleted([...completed, course.id])
        }
    }

    const saveProgress = async () => {
        try {
            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/completions`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(completed),
            })
            const body = await res.json()
            if (!res.ok) throw new Error(body.error || 'Could not save progress')
            setMessage({ ok: true, text: 'Saved!' })
        } catch (err) {
            setMessage({ ok: false, text: err.message })
        }
    }

    const filters = [
        { value: 'all', label: 'All Courses' },
        { value: 'completed', label: 'Completed Only' },
        { value: 'remaining', label: 'Remaining' },
    ]

    const visibleCourses = courses
        ? courses.filter(c => {
            if (filter === 'completed') return completed.includes(c.id)
            if (filter === 'remaining') return !completed.includes(c.id)
            return true
        })
        : null

    return (
        <div className="home-page container">
            <h1 className="home-page_title">Aurora CS Course Scheduler</h1>
            {isPending && <p className="home-page_loading">Loading...</p>}
            {error && <div className="home-page_error alert alert-danger">{error}</div>}
            {courses && (
                <>
                    <ProgressSummary
                        total={courses.length}
                        completed={courses.filter(c => getStatus(c) === 'Completed').length}
                        available={courses.filter(c => getStatus(c) === 'Available').length}
                        locked={courses.filter(c => getStatus(c) === 'Locked').length}
                    />
                    <div className="home-page_controls">
                        <div className="btn-group" role="group" aria-label="Filter courses">
                            {filters.map(f => (
                                <button
                                    key={f.value}
                                    type="button"
                                    className={`btn ${filter === f.value ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onClick={() => setFilter(f.value)}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                        <div className="home-page_save">
                            {message && (
                                <span className={message.ok ? 'text-success' : 'text-danger'}>
                                    {message.text}
                                </span>
                            )}
                            <button type="button" className="btn btn-success" onClick={saveProgress}>
                                Save
                            </button>
                        </div>
                    </div>
                    {visibleCourses.length ? (
                        <CourseList
                            courses={visibleCourses}
                            allCourses={courses}
                            getStatus={getStatus}
                            onToggle={toggleCourse}
                        />
                    ) : (
                        <p className="home-page_empty text-muted">No courses to show.</p>
                    )}
                </>
            )}
        </div>
    )
}
