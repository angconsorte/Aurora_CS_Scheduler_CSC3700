// server/util/validateCourse.js
// Shared by POST and PUT /api/courses. Returns an error message string, or null if valid.
function validateCourse(body) {
    const { number, title, credits, prerequisites } = body || {}

    if (!number || !title || credits === undefined || credits === null || credits === '') {
        return 'number, title, and credits are required'
    }
    if (!Number.isInteger(Number(credits))) {
        return 'credits must be a whole number'
    }
    if (prerequisites !== undefined) {
        if (!Array.isArray(prerequisites) || !prerequisites.every(Number.isInteger)) {
            return 'prerequisites must be an array of course ids'
        }
    }
    return null
}

module.exports = validateCourse