// server/tests/m2.test.js
// M2 acceptance tests. Run with the API already running (npm run dev):
//   npm test
// Part 1 checks project structure and rubric rules in the source.
// Part 2 calls every API route against the real database, then restores
// the completions and course 7 exactly as they were before the run.
const { test, describe, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { execSync } = require('node:child_process')

const SERVER = path.join(__dirname, '..')
const CLIENT = path.join(SERVER, '..')
const BASE = (process.env.API_URL || 'http://localhost:3000') + '/api'
const ORIGIN = 'http://localhost:5173'

const read = rel => fs.readFileSync(path.join(CLIENT, rel), 'utf8')
const exists = rel => fs.existsSync(path.join(CLIENT, rel))

async function api(method, url, body) {
    const res = await fetch(BASE + url, {
        method,
        headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
        body: body === undefined ? undefined : JSON.stringify(body),
    })
    const text = await res.text()
    return { status: res.status, body: text ? JSON.parse(text) : null, headers: res.headers }
}

const isCourseShape = c =>
    Number.isInteger(c.id) && typeof c.number === 'string' && typeof c.title === 'string' &&
    Number.isInteger(c.credits) && 'description' in c &&
    Array.isArray(c.prerequisites) && c.prerequisites.every(Number.isInteger)

// ------------------------------------------------------------------
describe('Part 1: project structure and rubric rules', () => {
    test('required server files exist', () => {
        for (const f of [
            'server/sql/schema.sql', 'server/sql/seed.sql',
            'server/routes/courses.js', 'server/routes/completions.js',
            'server/util/database.js', 'server/util/courseData.js', 'server/util/validateCourse.js',
            'server/server.js', 'server/requests.http', 'server/.env.example', 'server/package.json',
        ]) assert.ok(exists(f), `missing ${f}`)
    })

    test('JSON Server db/ folder is removed', () => {
        assert.ok(!exists('db'), 'db/ folder should be deleted')
    })

    test('.env files and node_modules are git-ignored and not tracked', () => {
        const tracked = execSync('git ls-files', { cwd: CLIENT }).toString().split('\n')
        for (const f of ['.env', 'server/.env']) {
            assert.ok(!tracked.includes(f), `${f} is committed`)
            execSync(`git check-ignore -q ${f}`, { cwd: CLIENT }) // throws if not ignored
        }
        assert.ok(!tracked.some(f => f.includes('node_modules/')), 'node_modules is committed')
    })

    test('.env.example has every required key', () => {
        const example = read('server/.env.example')
        for (const key of ['PORT', 'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'CLIENT_ORIGIN']) {
            assert.match(example, new RegExp(`^${key}=`, 'm'), `missing ${key}`)
        }
    })

    test('schema.sql defines the four tables with ON DELETE CASCADE foreign keys', () => {
        const sql = read('server/sql/schema.sql')
        for (const t of ['users', 'courses', 'prerequisites', 'completions']) {
            assert.match(sql, new RegExp(`CREATE TABLE ${t}`), `missing table ${t}`)
        }
        assert.equal((sql.match(/ON DELETE CASCADE/g) || []).length, 4)
    })

    test('server.js: CORS restricted to CLIENT_ORIGIN, express.json, routers under /api, no routes', () => {
        const s = read('server/server.js')
        assert.match(s, /cors\(\{\s*origin:\s*process\.env\.CLIENT_ORIGIN\s*\}\)/)
        assert.match(s, /express\.json\(\)/)
        assert.equal((s.match(/app\.use\('\/api',\s*\w+\)/g) || []).length, 2, 'both routers mounted under /api')
        assert.doesNotMatch(s, /app\.(get|post|put|delete)\(/, 'routes must not be defined in server.js')
    })

    test('routes use express.Router, the shared pool, the given helpers, and validateCourse', () => {
        const courses = read('server/routes/courses.js')
        const completions = read('server/routes/completions.js')
        for (const src of [courses, completions]) {
            assert.match(src, /express\.Router\(\)/)
            assert.match(src, /require\('\.\.\/util\/database'\)/)
            assert.doesNotMatch(src, /createPool|createConnection/, 'routes must not create connections')
        }
        assert.match(courses, /getCoursesWithPrereqs/)
        assert.match(courses, /require\('\.\.\/util\/validateCourse'\)/)
        assert.equal((courses.match(/validateCourse\(req\.body\)/g) || []).length, 2, 'POST and PUT share validateCourse')
        assert.match(completions, /replaceCompletions\(pool, USER_ID,/)
    })

    test("completions.js has USER_ID = 1 with the M3 comment", () => {
        const src = read('server/routes/completions.js')
        assert.match(src, /\/\/ M3: replaced by the logged-in user's id\s*\nconst USER_ID = 1/)
        assert.match(src, /WHERE user_id = \?/)
    })

    test('no SQL is built by concatenating values (template literals or +)', () => {
        for (const f of ['server/routes/courses.js', 'server/routes/completions.js']) {
            const src = read(f)
            const queries = src.match(/pool\.(query|execute)\(([\s\S]*?)\)/g) || []
            for (const q of queries) {
                assert.doesNotMatch(q, /`[^`]*\$\{/, `template literal in SQL in ${f}: ${q}`)
                assert.doesNotMatch(q, /['"]\s*\+\s*\w/, `string concatenation in SQL in ${f}: ${q}`)
            }
        }
    })

    test('React: no localStorage, no JSON Server port, data from /api via VITE_API_BASE_URL', () => {
        const files = execSync('git ls-files src; git ls-files -o --exclude-standard src', { cwd: CLIENT })
            .toString().split('\n').filter(f => /\.(jsx?|tsx?)$/.test(f))
        const all = files.map(f => read(f)).join('\n')
        assert.doesNotMatch(all, /localStorage/)
        assert.doesNotMatch(all, /3333/)
        assert.match(read('src/hooks/useFetch.js'), /import\.meta\.env\.VITE_API_BASE_URL/)
        const home = read('src/pages/HomePage.jsx')
        assert.match(home, /useFetch\('\/api\/courses'\)/)
        assert.match(home, /useFetch\('\/api\/completions'\)/)
        assert.match(home, /method: 'PUT'/)
    })

    test('About page shows version 2.0.0', () => {
        assert.equal(JSON.parse(read('package.json')).version, '2.0.0')
        assert.match(read('src/pages/AboutPage.jsx'), /version/)
    })

    test('requests.http covers every route and the three required error cases', () => {
        const http = read('server/requests.http')
        for (const r of [
            /^GET \{\{baseUrl\}\}\/courses$/m, /^GET \{\{baseUrl\}\}\/courses\/\d+$/m,
            /^POST \{\{baseUrl\}\}\/courses$/m, /^PUT \{\{baseUrl\}\}\/courses\/\d+$/m,
            /^DELETE \{\{baseUrl\}\}\/courses\/\d+$/m,
            /^GET \{\{baseUrl\}\}\/completions$/m, /^PUT \{\{baseUrl\}\}\/completions$/m,
        ]) assert.match(http, r)
        assert.match(http, /^###[^\n]*\(404\)\s*\nGET \{\{baseUrl\}\}\/courses\/\d+/m, '404 on a course')
        assert.match(http, /^###[^\n]*\(400\)\s*\nPOST \{\{baseUrl\}\}\/courses/m, '400 on a course POST')
        assert.match(http, /^###[^\n]*\(400[^\n]*\nPUT \{\{baseUrl\}\}\/completions/m, '400 on a completions PUT')
    })

    test('README explains how to run both halves', () => {
        const readme = fs.readFileSync(path.join(CLIENT, '..', 'README.md'), 'utf8')
        for (const s of ['.env.example', 'schema.sql', 'seed.sql', 'npm install', 'npm run dev', 'server']) {
            assert.ok(readme.includes(s), `README missing "${s}"`)
        }
    })
})

// ------------------------------------------------------------------
describe('Part 2: live API against the database', () => {
    let original = { completions: null, course7: null }
    let createdId = null

    before(async () => {
        try {
            await fetch(BASE + '/completions')
        } catch {
            throw new Error(`API is not running at ${BASE}. Start it with "npm run dev" first.`)
        }
        original.completions = (await api('GET', '/completions')).body
        original.course7 = (await api('GET', '/courses/7')).body
    })

    after(async () => {
        if (createdId) await api('DELETE', `/courses/${createdId}`)
        const c = original.course7
        if (c) {
            await api('PUT', '/courses/7', {
                number: c.number, title: c.title, credits: c.credits,
                description: c.description, prerequisites: c.prerequisites,
            })
        }
        if (original.completions) await api('PUT', '/completions', original.completions)
    })

    test('CORS allows only the React origin', async () => {
        const res = await api('GET', '/courses')
        assert.equal(res.headers.get('access-control-allow-origin'), ORIGIN)
    })

    test('GET /api/courses -> 200, Section 5 shape', async () => {
        const res = await api('GET', '/courses')
        assert.equal(res.status, 200)
        assert.ok(Array.isArray(res.body) && res.body.length > 0)
        assert.ok(res.body.every(isCourseShape), 'every course must match the Section 5 shape')
        const capstone = res.body.find(c => c.number === 'CSC4990')
        assert.deepEqual([...capstone.prerequisites].sort((a, b) => a - b), [6, 7])
    })

    test('GET /api/courses/:id -> 200 one course', async () => {
        const res = await api('GET', '/courses/2')
        assert.equal(res.status, 200)
        assert.ok(isCourseShape(res.body))
        assert.equal(res.body.number, 'CSC2150')
        assert.deepEqual(res.body.prerequisites, [1])
    })

    test('GET /api/courses/:id -> 404 for a missing course', async () => {
        const res = await api('GET', '/courses/999999')
        assert.equal(res.status, 404)
        assert.ok(res.body.error)
    })

    test('GET /api/courses/:id is not injectable', async () => {
        const res = await api('GET', '/courses/' + encodeURIComponent('1 OR 1=1'))
        assert.notEqual(res.status, 500)
        if (res.status === 200) assert.equal(res.body.id, 1) // MySQL casts '1 OR..' to 1, never "all rows"
    })

    test('POST /api/courses -> 400 when number, title, or credits is missing', async () => {
        for (const body of [
            { title: 'x', credits: 3 },
            { number: 'CSC4700', credits: 3 },
            { number: 'CSC4700', title: 'x' },
        ]) {
            const res = await api('POST', '/courses', body)
            assert.equal(res.status, 400, JSON.stringify(body))
            assert.ok(res.body.error)
        }
    })

    test('POST /api/courses -> 201 with new course and its prerequisite rows', async () => {
        const res = await api('POST', '/courses', {
            number: 'CSC4600', title: 'Cloud Computing', credits: 3,
            description: 'Test course', prerequisites: [5, 9],
        })
        assert.equal(res.status, 201, JSON.stringify(res.body))
        assert.ok(isCourseShape(res.body))
        createdId = res.body.id
        assert.deepEqual([...res.body.prerequisites].sort((a, b) => a - b), [5, 9])

        const again = await api('GET', `/courses/${createdId}`)
        assert.equal(again.status, 200)
        assert.equal(again.body.number, 'CSC4600')
    })

    test('GET /api/courses now has N+1 courses (summary is X of N)', async () => {
        const res = await api('GET', '/courses')
        assert.ok(res.body.some(c => c.id === createdId))
    })

    test('PUT /api/courses/:id -> 200 and replaces prerequisites', async () => {
        const res = await api('PUT', '/courses/7', {
            number: 'CSC3700', title: 'Advanced Web Application Development', credits: 3,
            description: 'React, Node/Express, MySQL, JWT authentication.', prerequisites: [3, 5],
        })
        assert.equal(res.status, 200, JSON.stringify(res.body))
        assert.deepEqual([...res.body.prerequisites].sort((a, b) => a - b), [3, 5])

        const shrink = await api('PUT', '/courses/7', {
            number: 'CSC3700', title: 'Advanced Web Application Development', credits: 3,
            description: 'x', prerequisites: [5],
        })
        assert.deepEqual(shrink.body.prerequisites, [5], 'old prerequisite rows must be deleted')
    })

    test('PUT /api/courses/:id -> 400 when a required field is missing', async () => {
        const res = await api('PUT', '/courses/7', { number: 'CSC3700', title: 'x' })
        assert.equal(res.status, 400)
    })

    test('PUT /api/courses/:id -> 404 for a missing course', async () => {
        const res = await api('PUT', '/courses/999999', { number: 'CSC9999', title: 'x', credits: 3 })
        assert.equal(res.status, 404)
    })

    test('GET /api/completions -> 200 array of ids', async () => {
        const res = await api('GET', '/completions')
        assert.equal(res.status, 200)
        assert.ok(Array.isArray(res.body) && res.body.every(Number.isInteger))
    })

    test('PUT /api/completions -> 200 saves and returns the array', async () => {
        const res = await api('PUT', '/completions', [1, 3, 2])
        assert.equal(res.status, 200)
        assert.deepEqual(res.body, [1, 2, 3])
        assert.deepEqual((await api('GET', '/completions')).body, [1, 2, 3])
    })

    test('PUT /api/completions -> 400 and saves NOTHING when a prerequisite is missing', async () => {
        const res = await api('PUT', '/completions', [1, 10])
        assert.equal(res.status, 400)
        assert.ok(res.body.error)
        assert.deepEqual((await api('GET', '/completions')).body, [1, 2, 3], 'invalid PUT must not change data')
    })

    test('PUT /api/completions -> 400 for a body that is not an array / unknown ids', async () => {
        assert.equal((await api('PUT', '/completions', { completed: [1] })).status, 400)
        assert.equal((await api('PUT', '/completions', [999999])).status, 400)
        assert.deepEqual((await api('GET', '/completions')).body, [1, 2, 3])
    })

    test('PUT /api/completions [] clears the list', async () => {
        const res = await api('PUT', '/completions', [])
        assert.equal(res.status, 200)
        assert.deepEqual((await api('GET', '/completions')).body, [])
    })

    test('DELETE /api/courses/:id -> 200 returns the course; cascade removes its completions', async () => {
        // complete the new course (needs 1, 2, 5, 9 first), then delete it
        const chain = [1, 2, 5, 9, createdId]
        assert.equal((await api('PUT', '/completions', chain)).status, 200)

        const res = await api('DELETE', `/courses/${createdId}`)
        assert.equal(res.status, 200)
        assert.equal(res.body.id, createdId)
        assert.equal(res.body.number, 'CSC4600')

        assert.equal((await api('GET', `/courses/${createdId}`)).status, 404)
        const after = (await api('GET', '/completions')).body
        assert.ok(!after.includes(createdId), 'ON DELETE CASCADE should remove the completion')
        createdId = null
    })

    test('DELETE /api/courses/:id -> 404 for a missing course', async () => {
        const res = await api('DELETE', '/courses/999999')
        assert.equal(res.status, 404)
    })
})
