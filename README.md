**[日本語版 README はこちら](./readme_Japanese.md)**

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
- **Frontend**: React, TypeScript
- **Backend**: Node.js / Express
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (JWT, Refresh Tokens)
- **Others**: Chakra UI, Axios, etc.

## Installation & Setup
1. **Clone** the repository:
   ```bash
   git clone https://github.com/<your_repo>/Workout-Journal.git
   cd Workout-Journal

## Install dependencies:
npm install
or
yarn install

Configure environment variables (e.g., .env):
Provide your Supabase project credentials (URL, anon/public keys).
Configure any other environment variables (JWT secrets, etc.) as needed.

## Run the app:
npm run dev
or
yarn dev

Access the application in your browser at http://

## Usage
Sign up for a new account.
Log in with your credentials.
Select a date on the calendar for which you want to record workouts.
Input details of your exercise: exercise name, weight, reps, rest intervals, etc.
Save the log to track and compare progress over time.
