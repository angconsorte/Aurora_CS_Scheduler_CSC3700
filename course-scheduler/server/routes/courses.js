// server/routes/courses.js
const express = require('express')
const pool = require('../util/database')
const { getCoursesWithPrereqs } = require('../util/courseData')
const validateCourse = require('../util/validateCourse')

const router = express.Router()

// Duplicate course number -> 400, anything else -> 500
const sendDbError = (res, err) => {
    if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ error: 'A course with that number already exists' })
    }
    res.status(500).json({ error: err.message })
}

// Returns an error message if the prerequisite ids are not usable, otherwise null
const checkPrereqIds = async (ids, selfId) => {
    if (ids.length === 0) return null
    if (selfId !== undefined && ids.includes(selfId)) {
        return 'A course cannot be its own prerequisite'
    }
    const [rows] = await pool.query('SELECT id FROM courses WHERE id IN (?)', [ids])
    return rows.length === ids.length ? null : 'One or more prerequisite ids do not exist'
}

const insertPrereqs = async (courseId, ids) => {
    if (ids.length === 0) return
    const rows = ids.map(prereqId => [courseId, prereqId])
    await pool.query('INSERT INTO prerequisites (course_id, prereq_id) VALUES ?', [rows])
}

router.get('/courses', async (req, res) => {
    try {
        const courses = await getCoursesWithPrereqs(pool)
        res.json(courses)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

router.get('/courses/:id', async (req, res) => {
    try {
        const course = await getCoursesWithPrereqs(pool, Number(req.params.id))
        if (!course) return res.status(404).json({ error: 'Course not found' })
        res.json(course)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

router.post('/courses', async (req, res) => {
    const problem = validateCourse(req.body)
    if (problem) return res.status(400).json({ error: problem })

    const { number, title, credits, description } = req.body
    const prereqIds = [...new Set(req.body.prerequisites || [])]

    try {
        const prereqProblem = await checkPrereqIds(prereqIds)
        if (prereqProblem) return res.status(400).json({ error: prereqProblem })

        const [result] = await pool.query(
            'INSERT INTO courses (number, title, credits, description) VALUES (?, ?, ?, ?)',
            [number, title, Number(credits), description ?? null]
        )
        await insertPrereqs(result.insertId, prereqIds)

        const created = await getCoursesWithPrereqs(pool, result.insertId)
        res.status(201).json(created)
    } catch (err) {
        sendDbError(res, err)
    }
})

router.put('/courses/:id', async (req, res) => {
    const id = Number(req.params.id)

    const problem = validateCourse(req.body)
    if (problem) return res.status(400).json({ error: problem })

    const { number, title, credits, description } = req.body
    const prereqIds = [...new Set(req.body.prerequisites || [])]

    try {
        const prereqProblem = await checkPrereqIds(prereqIds, id)
        if (prereqProblem) return res.status(400).json({ error: prereqProblem })

        const [result] = await pool.query(
            'UPDATE courses SET number = ?, title = ?, credits = ?, description = ? WHERE id = ?',
            [number, title, Number(credits), description ?? null, id]
        )
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Course not found' })
        }

        await pool.query('DELETE FROM prerequisites WHERE course_id = ?', [id])
        await insertPrereqs(id, prereqIds)

        const updated = await getCoursesWithPrereqs(pool, id)
        res.json(updated)
    } catch (err) {
        sendDbError(res, err)
    }
})

router.delete('/courses/:id', async (req, res) => {
    try {
        const id = Number(req.params.id)
        const course = await getCoursesWithPrereqs(pool, id)
        if (!course) return res.status(404).json({ error: 'Course not found' })

        // ON DELETE CASCADE removes the prerequisites and completions rows
        await pool.query('DELETE FROM courses WHERE id = ?', [id])
        res.json(course)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

module.exports = router