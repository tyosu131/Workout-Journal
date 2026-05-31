**[日本語版 README はこちら](./readme_Japanese)**

# Workout Journal

A web application to track daily workout logs, visualize progress, and manage training sessions more effectively.

## Project Overview
I wanted to build a workout logging app that's easy to manage day by day. By comparing each workout date to the previous sessions, users can see how much they've progressed (progressive overload). This approach led me to design a calendar-style interface for better daily management.

## Features
- User registration & login
- Create, update, and delete workout logs
- Update user information (username, email, etc.)
- Calendar-style view to track progress by date

For a detailed list of features, please see [this GitHub repository](https://github.com/tyosu131/Workout-Journal.git).

## Tech Stack
- **Frontend**: Next.js, React, TypeScript
- **Backend**: Node.js / Express
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (JWT, Refresh Tokens)
- **Others**: Chakra UI, Axios, etc.

## Installation & Setup
1. **Clone** the repository:
   ```bash
   git clone https://github.com/<your_repo>/Workout-Journal.git
   cd Workout-Journal
   ```

2. **Install dependencies:**
   ```bash
   npm install
   npm install --prefix frontend
   npm install --prefix backend
   ```

Configure environment variables (e.g., .env):
Provide your Supabase project credentials (URL, anon/public keys).
Configure any other environment variables (JWT secrets, etc.) as needed.

## Environment Variables
Use [backend/.env.example](./backend/.env.example) and [frontend/.env.example](./frontend/.env.example) as templates. Never commit real secrets, tokens, cookie values, or production environment values.

### Backend
| Variable | Required | Secret | Notes |
| --- | --- | --- | --- |
| `PORT` | No | No | Express port. Defaults to `3001`. |
| `CORS_ORIGIN` | No | No | Allowed frontend origin for credentialed CORS. Defaults to `http://localhost:3000`. Set this to the Azure Static Web Apps origin in production. |
| `FRONTEND_ORIGIN` | No | No | Alternative to `CORS_ORIGIN`; used only when `CORS_ORIGIN` is unset. |
| `SUPABASE_URL` | Yes | No | Supabase project URL for backend access. |
| `SUPABASE_KEY` | Yes | Yes | Backend Supabase key. Treat as secret, especially if using a service-role key. |
| `JWT_SECRET` | Yes | Yes | JWT signing secret. Must be different per environment. |
| `ACCESS_TOKEN_EXPIRES` | No | No | Access token lifetime. Defaults to `1h`. |
| `REFRESH_TOKEN_EXPIRES` | No | No | Refresh token lifetime. Defaults to `7d`. |

### Frontend
| Variable | Required | Secret | Notes |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | Yes | No | Backend API base URL. Use `http://localhost:3001` locally and the Azure backend URL in production. |
| `NEXT_PUBLIC_SUPABASE_URL` | If frontend Supabase APIs are used | No | Supabase project URL exposed to the browser. |
| `NEXT_PUBLIC_SUPABASE_KEY` | If frontend Supabase APIs are used | No | Supabase anon/public key only. Do not set a service-role key here. |

For Azure or other production deployments, configure these values in the hosting platform rather than storing real values in repository files.

## Verification
See [docs/verification.md](./docs/verification.md) for local and CI verification commands.

## Run the app:
```bash
npm run dev
```

Access the application in your browser:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## Usage
Sign up for a new account.
Log in with your credentials.
Select a date on the calendar for which you want to record workouts.
Input details of your exercise: exercise name, weight, reps, rest intervals, etc.
Save the log to track and compare progress over time.
