# Aurora CS Course Scheduler

CSC3700 semester project (Milestone 1). A React + Vite app that shows the Aurora CS course catalog, tracks completed courses, and shows which courses are available based on prerequisites. Course data is served by JSON Server.

## Requirements

- Node.js 20+ and npm

## Running the project

All commands run from the `course-scheduler/` folder.

```bash
cd course-scheduler

# 1. Install dependencies
npm install

# 2. Create the .env file (it is not committed)
echo "VITE_API_BASE_URL=http://localhost:3333" > .env

# 3. Start JSON Server (leave this terminal running)
npx json-server --watch db/db.json --port 3333

# 4. In a second terminal, start the React app
npm run dev
```

Open http://localhost:5173. The API is at http://localhost:3333/courses.

## Features

- Catalog fetched from JSON Server with the `useFetch` hook (loading and error states)
- Courses labeled **Completed**, **Available**, or **Locked**
- A course can only be completed once all its prerequisites are completed
- Unchecking a course also unchecks every course that depends on it
- Filter: All Courses / Completed Only / Remaining
- Progress summary of completed, available, and locked counts
- **Save** stores progress in localStorage; it is restored on reload
- React Router navbar with Home (`/`) and About (`/about`) pages
