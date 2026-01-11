Start project in dev:
npm run dev

Start project in prod:
npm run build
npm start

Run prisma migration dev:
npx prisma migrate dev --name xxxxxx

---

## API Endpoints

**Base URL:** `http://localhost:3000` (default)

**Authentication** (no token required):

- `POST /auth/register` — body: `{ email, password }` — create a new user
- `POST /auth/login` — body: `{ email, password }` — returns `{ accessToken }`
- `GET /auth/me` — header: `Authorization: Bearer <token>` — get current user

> All other endpoints require the `Authorization: Bearer <token>` header.

**Boards** (authenticated):

- `GET /boards` — list boards
- `POST /boards` — body: `{ title }` — create a board
- `GET /boards/:id` — get board by id
- `DELETE /boards/:id` — delete a board
- `POST /boards/:id/columns` — body: `{ title }` — add a column to a board
- `PATCH /boards/:id/columns/reorder` — body: `{ columnOrder: string[] }` — reorder columns

**Columns**:

- `PATCH /columns/:columnId` — update column
- `DELETE /columns/:columnId` — delete column
- `POST /columns/:columnId/tasks` — body: `{ title, description? }` — create a task in column

**Tasks**:

- `PATCH /tasks/:taskId` — update task fields
- `PATCH /tasks/:taskId/move` — body: `{ columnId, position }` — move task to column/position
- `DELETE /tasks/:taskId` — delete task
