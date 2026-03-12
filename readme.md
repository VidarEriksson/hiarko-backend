Start project in dev:

```bash
npm run dev
```

Start project in prod:

```bash
npm run build
npm start
```

Run prisma migration dev:

```bash
npx prisma migrate dev --name xxxxxx
```

---

## API Reference

**Base URL:** `http://localhost:3000`

> All routes except `/auth/*` require an Authorization header:
>
> `Authorization: Bearer <token>`

---

## Authentication

### POST /auth/register

Creates a new user.

**Request body** (JSON):

```json
{
  "email": "user@example.com",
  "password": "supersecret",
  "name": "Optional Name"
}
```

**Response** (201 Created):

```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "Optional Name",
  "createdAt": "2026-03-11T00:00:00.000Z"
}
```

**Errors**

- 400: missing `email` or `password`
- 500: internal error (e.g. duplicate email)

---

### POST /auth/login

Returns an access token.

**Request body** (JSON):

```json
{
  "email": "user@example.com",
  "password": "supersecret"
}
```

**Response** (200 OK):

```json
{
  "token": "<jwt>"
}
```

**Errors**

- 400: missing email or password
- 401: invalid credentials

---

### GET /auth/me

Returns the currently authenticated user.

**Headers**

```http
Authorization: Bearer <token>
```

**Response** (200 OK):

```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "Optional Name"
  }
}
```

**Errors**

- 401: missing or malformed token
- 403: invalid or expired token

---

## Boards

### GET /boards

List all boards the current user has access to.

**Headers**

```http
Authorization: Bearer <token>
```

**Response** (200 OK):

```json
{
  "boards": [
    {
      "id": 1,
      "name": "My Board",
      "createdAt": "2026-03-11T00:00:00.000Z",
      "ownerId": 1
    }
  ]
}
```

---

### POST /boards

Create a new board.

**Headers**

```http
Authorization: Bearer <token>
```

**Request body** (JSON):

```json
{
  "name": "My Board"
}
```

**Response** (201 Created):

```json
{
  "board": {
    "id": 1,
    "name": "My Board",
    "createdAt": "2026-03-11T00:00:00.000Z",
    "ownerId": 1
  }
}
```

**Errors**

- 400: missing or invalid `name`

---

### GET /boards/:id

Get a single board with columns and tasks.

**Headers**

```http
Authorization: Bearer <token>
```

**Response** (200 OK):

```json
{
  "board": {
    "id": 1,
    "name": "My Board",
    "createdAt": "2026-03-11T00:00:00.000Z",
    "ownerId": 1,
    "columns": [
      {
        "id": 10,
        "boardId": 1,
        "name": "Todo",
        "position": 0,
        "createdAt": "2026-03-11T00:00:00.000Z",
        "updatedAt": "2026-03-11T00:00:00.000Z",
        "tasks": [
          {
            "id": 100,
            "boardId": 1,
            "columnId": 10,
            "title": "Example task",
            "description": null,
            "position": 0,
            "priority": 0,
            "assigneeId": null,
            "dueDate": null,
            "createdById": 1,
            "createdAt": "2026-03-11T00:00:00.000Z",
            "updatedAt": "2026-03-11T00:00:00.000Z",
            "assignee": null
          }
        ]
      }
    ],
    "members": [
      {
        "boardId": 1,
        "userId": 1,
        "role": "OWNER",
        "joinedAt": "2026-03-11T00:00:00.000Z",
        "user": {
          "id": 1,
          "name": "Optional Name",
          "email": "user@example.com"
        }
      }
    ]
  },
  "role": "OWNER"
}
```

**Errors**

- 400: invalid board id
- 404: board not found or not accessible

---

### DELETE /boards/:id

Delete a board (must be owner).

**Headers**

```http
Authorization: Bearer <token>
```

**Response** (200 OK):

```json
{ "message": "Deleted" }
```

**Errors**

- 400: invalid board id
- 403: not the owner

---

### POST /boards/:id/columns

Create a new column in a board.

**Headers**

```http
Authorization: Bearer <token>
```

**Request body** (JSON):

```json
{ "name": "Todo" }
```

**Response** (201 Created):

```json
{ "column": { "id": 10, "boardId": 1, "name": "Todo", "position": 0, "createdAt": "2026-03-11T00:00:00.000Z", "updatedAt": "2026-03-11T00:00:00.000Z" } }
```

**Errors**

- 400: invalid name
- 403: not a board member

---

### PATCH /boards/:id/columns/reorder

Reorder columns for a board.

**Headers**

```http
Authorization: Bearer <token>
```

**Request body** (JSON):

```json
{ "columnIds": [10, 11, 12] }
```

**Response** (200 OK):

```json
{ "message": "Reordered" }
```

**Errors**

- 400: invalid payload (not an array of ids, missing ids, or mismatch with existing columns)
- 403: not a board member

---

## Columns

### PATCH /columns/:columnId

Update a column.

**Headers**

```http
Authorization: Bearer <token>
```

**Request body** (JSON):

```json
{ "name": "In Progress" }
```

**Response** (200 OK):

```json
{ "column": { "id": 10, "boardId": 1, "name": "In Progress", "position": 1, "createdAt": "2026-03-11T00:00:00.000Z", "updatedAt": "2026-03-11T00:00:00.000Z" } }
```

**Errors**

- 400: invalid payload
- 404: column not found
- 403: not a board member

---

### DELETE /columns/:columnId

Delete a column.

**Headers**

```http
Authorization: Bearer <token>
```

**Response** (200 OK):

```json
{ "message": "Deleted" }
```

**Errors**

- 400: invalid column id
- 404: column not found
- 403: not a board member

---

### POST /columns/:columnId/tasks

Create a task in a column.

**Headers**

```http
Authorization: Bearer <token>
```

**Request body** (JSON):

```json
{ "title": "Write docs", "description": "..." }
```

**Response** (201 Created):

```json
{ "task": { "id": 100, "boardId": 1, "columnId": 10, "title": "Write docs", "description": "...", "position": 0, "priority": 0, "assigneeId": null, "dueDate": null, "createdById": 1, "createdAt": "2026-03-11T00:00:00.000Z", "updatedAt": "2026-03-11T00:00:00.000Z" } }
```

**Errors**

- 400: missing or invalid title
- 404: column not found
- 403: not a board member

---

## Tasks

### PATCH /tasks/:taskId

Update task fields. Any subset of fields may be provided.

**Headers**

```http
Authorization: Bearer <token>
```

**Request body** (JSON):

```json
{
  "title": "New title",
  "description": "Updated",
  "priority": 1,
  "assigneeId": 2,
  "dueDate": "2026-04-01T00:00:00.000Z"
}
```

**Response** (200 OK):

```json
{ "task": { ...updated task... } }
```

**Errors**

- 400: invalid payload (wrong types)
- 404: task not found
- 403: not a board member

---

### PATCH /tasks/:taskId/move

Move a task to another column/position.

**Headers**

```http
Authorization: Bearer <token>
```

**Request body** (JSON):

```json
{ "columnId": 11, "position": 0 }
```

**Response** (200 OK):

```json
{ "message": "Moved", "task": { ...updated task... } }
```

**Errors**

- 400: invalid payload or invalid target column/position
- 404: task not found
- 403: not a board member

---

### DELETE /tasks/:taskId

Delete a task.

**Headers**

```http
Authorization: Bearer <token>
```

**Response** (200 OK):

```json
{ "message": "Deleted" }
```

**Errors**

- 404: task not found
- 403: not a board member
```
