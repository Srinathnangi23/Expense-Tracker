# Expense Tracker API

FastAPI + PostgreSQL backend for an expense tracking app. Includes JWT auth, categories, expenses CRUD, filtering/search, and a monthly summary endpoint.

## Stack
- FastAPI
- PostgreSQL (via SQLAlchemy)
- JWT auth (python-jose + passlib/bcrypt)
- Pydantic v2

## Setup

1. **Create a virtual environment and install dependencies**
   ```bash
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Create a PostgreSQL database**
   ```bash
   createdb expense_tracker
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env: set DATABASE_URL and a strong SECRET_KEY
   ```
   Generate a secret key:
   ```bash
   python -c "import secrets; print(secrets.token_hex(32))"
   ```

4. **Run the server**
   ```bash
   uvicorn app.main:app --reload
   ```
   Tables are auto-created on startup (via `Base.metadata.create_all`). For production, switch to Alembic migrations instead.

5. **Explore the API**
   - Swagger UI: http://localhost:8000/docs
   - ReDoc: http://localhost:8000/redoc

## Auth flow

1. `POST /auth/register` — create an account (`name`, `email`, `password`)
2. `POST /auth/login` — OAuth2 password flow. Send as form data: `username` (= email) and `password`. Returns a JWT `access_token`.
3. Send `Authorization: Bearer <token>` on all subsequent requests.
4. `GET /auth/me` — get the current user.

## Endpoints

### Categories
- `GET /categories/` — list your categories
- `POST /categories/` — create `{ name, color? }`
- `PUT /categories/{id}` — update
- `DELETE /categories/{id}` — delete

### Expenses
- `GET /expenses/` — list, with query params:
  - `category_id`, `start_date`, `end_date`, `search`
  - `sort_by` = date | amount | title, `order` = asc | desc
  - `skip`, `limit` for pagination
- `POST /expenses/` — create `{ title, amount, date, notes?, category_id? }`
- `GET /expenses/{id}` — get one
- `PUT /expenses/{id}` — update (partial)
- `DELETE /expenses/{id}` — delete
- `GET /expenses/summary/monthly?year=2026&month=8` — total + breakdown by category

## Notes
- All expense/category data is scoped to the authenticated user — no cross-user access.
- Passwords are hashed with bcrypt, never stored in plain text.
- CORS origins are configurable via `.env` (`CORS_ORIGINS`), so you can point this at your frontend dev server.
- For production: use Alembic for migrations, put `SECRET_KEY` in a real secrets manager, and set `allow_origins` to your actual frontend domain(s).
