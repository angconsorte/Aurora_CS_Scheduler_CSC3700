# Aurora CS Course Scheduler (M2)

React + Vite front end, Node/Express API, MySQL database.

**Authors:** Angelo Consorte and Jocelyn Sahagun

See the main [README](../README.md) at the repository root for full run instructions, the API reference, and tests.

## 1. Database
1. Run `server/sql/schema.sql` against your team database.
2. Run `server/sql/seed.sql` after it.

## 2. Server (port 3000)
```
cd server
cp .env.example .env     # then fill in DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
npm install
npm run dev
```

## 3. Client (port 5173)
In a second terminal, from the project root:
```
cp .env.example .env     # VITE_API_BASE_URL=http://localhost:3000
npm install
npm run dev
```
Open http://localhost:5173. Restart `npm run dev` if you change `.env`.

## Testing the API
`server/requests.http` has a request for every route and the error cases (WebStorm HTTP Client).