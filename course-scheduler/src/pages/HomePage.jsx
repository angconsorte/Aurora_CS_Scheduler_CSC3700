import { useState } from 'react'
import useFetch from '../hooks/useFetch'
import CourseList from '../components/CourseList'

export default function HomePage() {
    const { data, isPending, error } = useFetch('/courses')
    const courses = data
        ? data.map(c => ({
            ...c,
            id: Number(c.id),
            prerequisites: c.prerequisites.map(Number),
        }))
        : null
    const [completed, setCompleted] = useState([])

    const isAvailable = (course, done) =>
        course.prerequisites.every(id => done.includes(id))

    const getStatus = course => {
        if (completed.includes(course.id)) return 'Completed'
        return isAvailable(course, completed) ? 'Available' : 'Locked'
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
            setCompleted(next)
        } else if (isAvailable(course, completed)) {
            setCompleted([...completed, course.id])
        }
    }

    return (
        <div className="home-page container">
            <h1 className="home-page_title">Aurora CS Course Scheduler</h1>
            {isPending && <p className="home-page_loading">Loading...</p>}
            {error && <div className="home-page_error alert alert-danger">{error}</div>}
            {courses && (
                <CourseList
                    courses={courses}
                    allCourses={courses}
                    getStatus={getStatus}
                    onToggle={toggleCourse}
                />
            )}
        </div>
    )
}