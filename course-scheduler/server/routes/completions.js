// server/routes/completions.js
const express = require('express')
const pool = require('../util/database')
const { getCoursesWithPrereqs, replaceCompletions } = require('../util/courseData')

const router = express.Router()

const USER_ID = 1 // M3: replaced by the logged-in user's id

// courses: array in the Section 5 shape, completed: array of ids
const isValidCompletionSet = (courses, completed) => {
    return completed.every(id => {
        const course = courses.find(c => c.id === id)
        return course && course.prerequisites.every(p => completed.includes(p))
    })
}

// Builds a readable message for the first course that breaks the rule
const describeProblem = (courses, completed) => {
    for (const id of completed) {
        const course = courses.find(c => c.id === id)
        if (!course) return `Course ${id} does not exist`
        const missing = course.prerequisites.filter(p => !completed.includes(p))
        if (missing.length > 0) {
            const names = missing.map(p => courses.find(c => c.id === p)?.number ?? p)
            return `${course.number} requires ${names.join(', ')}`
        }
    }
    return 'Invalid completion list'
}

router.get('/completions', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT course_id FROM completions WHERE user_id = ? ORDER BY course_id',
            [USER_ID]
        )
        res.json(rows.map(r => r.course_id))
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

router.put('/completions', async (req, res) => {
    const body = req.body
    if (!Array.isArray(body) || !body.every(Number.isInteger)) {
        return res.status(400).json({ error: 'Body must be an array of course ids' })
    }
    const ids = [...new Set(body)].sort((a, b) => a - b)

    try {
        const courses = await getCoursesWithPrereqs(pool)
        if (!isValidCompletionSet(courses, ids)) {
            return res.status(400).json({ error: describeProblem(courses, ids) })
        }

        await replaceCompletions(pool, USER_ID, ids)
        res.json(ids)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

module.exports = router