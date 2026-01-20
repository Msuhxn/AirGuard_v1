# AirGuard (IU Portfolio Project)

A web app that provides personalized air-quality alerts based on WHO-style thresholds and user groups (normal/asthma/child/elderly).
Features:
- Onboarding: name, age, group (saved in local SQLite DB)
- Live Mode (while app open): location-based air quality checks + alerts
- Favourites: save Home/Work and show on map
- History: stores last 30 checks for current user

## Run Backend
```bash
cd backend
npm install
npm start
