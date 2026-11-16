# Aurora CS Course Scheduler

**Authors:** Angelo Consorte and Jocelyn Sahagun — CSC3700, Fall 2026, Prof. Lash

CSC3700 semester project (Milestone 2). A React + Vite app that shows the Aurora CS course catalog, tracks completed courses, and shows which courses are available based on prerequisites. Course data and completion state are stored in MySQL and served by a Node/Express API.

| Layer     | Technology                     | Runs on               |
|-----------|--------------------------------|-----------------------|
| Front end | React + Vite + Bootstrap       | http://localhost:5173 |
| API       | Node + Express + mysql2 (pool) | http://localhost:3000 |
| Database  | MySQL (team database)          | Class MySQL server    |

## Requirements

- Node.js 20+ and npm
- Access to a MySQL database (host, user, password, database name)

## Running the project

You run two programs at the same time, in two terminals: the Express API and the React dev server. All paths below are relative to the `course-scheduler/` folder.

### 1. Configure the server

```bash
cd course-scheduler/server
cp .env.example .env
```

Edit `server/.env` and fill in your database credentials:

```
PORT=3000
DB_HOST=your_db_host
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name
CLIENT_ORIGIN=http://localhost:5173
```

### 2. Create and seed the database

Run these two scripts against your database, in this order (phpMyAdmin's SQL tab, MySQL Workbench, or the `mysql` CLI):

1. `server/sql/schema.sql` — drops and recreates the `users`, `courses`, `prerequisites`, and `completions` tables
2. `server/sql/seed.sql` — loads the 10 courses, their prerequisites, user `student1`, and two sample completions

With the `mysql` CLI (from `course-scheduler/server`):

```bash
mysql -h <DB_HOST> -u <DB_USER> -p <DB_NAME> < sql/schema.sql
mysql -h <DB_HOST> -u <DB_USER> -p <DB_NAME> < sql/seed.sql
```

Rerun both scripts at any time to reset the data.

### 3. Start the API (terminal 1)

```bash
cd course-scheduler/server
npm install
npm run dev
```

The API listens on http://localhost:3000. Check it with http://localhost:3000/api/courses.

### 4. Start the React app (terminal 2)

```bash
cd course-scheduler
cp .env.example .env     # VITE_API_BASE_URL=http://localhost:3000
npm install
npm run dev
```

Restart `npm run dev` if you change `.env`.

Open http://localhost:5173.

## API

| Method | Route              | Purpose                                         | Success              | Errors   |
|--------|--------------------|-------------------------------------------------|----------------------|----------|
| GET    | `/api/courses`     | All courses, each with a `prerequisites` array  | 200                  |          |
| GET    | `/api/courses/:id` | One course                                      | 200                  | 404      |
| POST   | `/api/courses`     | Create a course and its prerequisite rows       | 201 + new course     | 400      |
| PUT    | `/api/courses/:id` | Update a course and replace its prerequisites   | 200 + updated course | 400, 404 |
| DELETE | `/api/courses/:id` | Delete a course                                 | 200 + deleted course | 404      |
| GET    | `/api/completions` | Array of completed course ids                   | 200                  |          |
| PUT    | `/api/completions` | Replace the completed list (prereqs enforced)   | 200 + saved array    | 400      |

`server/requests.http` (WebStorm HTTP Client) has a request for every route plus the error cases.

### Automated tests

With the API running, from `course-scheduler/server`:

```bash
npm test
```

`tests/m2.test.js` checks the project structure and rubric rules, then calls every route against the database (success and error cases, prerequisite enforcement, cascade delete). It restores the completions and any course it changed when it finishes.

M2 has no login: the API uses one hardcoded user (`USER_ID = 1`, `student1`) in `routes/completions.js`.

## Features

- Catalog and completions loaded from the Express API with the `useFetch` hook (loading and error states)
- Courses labeled **Completed**, **Available**, or **Locked**
- A course can only be completed once all its prerequisites are completed
- Unchecking a course also unchecks every course that depends on it
- Filter: All Courses / Completed Only / Remaining
- Progress summary: X of N completed, plus available and locked counts
- **Save** writes completions to MySQL (`PUT /api/completions`) and shows a success or error message; reloading shows the saved state
- The server rejects any completion list that breaks a prerequisite (400, nothing saved)
- React Router navbar with Home (`/`) and About (`/about`) pages
