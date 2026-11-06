# serviQ Backend

## Setup
1. Copy `.env.example` to `.env` and set `MONGO_URI` and a strong `JWT_SECRET`.
2. Install dependencies with `npm install`.
3. Start the API with `npm run dev`.

The API runs on `http://localhost:5000` by default.

## Authentication endpoints
- `POST /api/auth/register` — public customer/provider registration. The `role` must be `Customer` or `Service Provider`.
- `POST /api/auth/login` — sign in with `{ "email", "password", "expectedRole" }`. `expectedRole` must match the account role.
- `GET /api/auth/me` — current authenticated user; requires `Authorization: Bearer <token>`.

Administrator accounts are intentionally not self-registerable. Create or promote an administrator through a trusted database/admin provisioning process, then use `/login/admin`. Do not expose admin account creation on the public registration page.

## Create the first administrator
Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env` (use a unique password with at least 12 characters), then run:

```bash
npm run create-admin
```

This creates the administrator if it does not exist, or resets the password and restores the Administrator role for that exact email. Keep these values private and remove the bootstrap password from the environment after provisioning if you do not need it again.
