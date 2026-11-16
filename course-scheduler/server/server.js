// server/server.js
require('dotenv').config()
const express = require('express')
const cors = require('cors')

const coursesRouter = require('./routes/courses')
const completionsRouter = require('./routes/completions')

const app = express()

app.use(cors({ origin: process.env.CLIENT_ORIGIN }))
app.use(express.json())

app.use('/api', coursesRouter)
app.use('/api', completionsRouter)

// Malformed JSON bodies -> JSON 400 instead of an HTML error page
// Express only treats a 4-argument function as error middleware, so `next` must stay
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'Invalid JSON body' })
    }
    res.status(500).json({ error: err.message })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`))