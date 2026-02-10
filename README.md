
# AirGuard – Personalised Air Quality Monitor

**Course:** DLBCSPJWD01  
**Institution:** IU International University of Applied Sciences  
**Student Project Submission**

---

## About the Project

AirGuard is a web-based application developed to help users understand air quality in a simple and personalised way. Many existing platforms display raw pollution values (for example PM2.5), but they often do not explain what those values mean in everyday health terms.

AirGuard translates air quality numbers into a clearer status (**Good / Moderate / Risky**) and provides short recommendations based on the user’s selected **risk group** (Normal, Asthma, Child, Elderly).

---

## Project Idea

The core idea is to evaluate air quality data and present it in a health-oriented way:

1. The user selects a risk group when opening the application.  
2. A location is selected using GPS or the search function.  
3. Air pollution data is retrieved from the OpenWeather API.  
4. Pollution values are compared with WHO-inspired threshold values (adapted for the selected risk group).  
5. The system displays a risk level together with a short recommendation.

---

## Key Features

- Air quality check based on current GPS location  
- Location search using place names  
- Display of PM2.5, PM10, and O₃ values  
- Risk group profiles (Normal, Asthma, Child, Elderly)  
- Clear classification (Good, Moderate, Risky)  
- Short health recommendations  
- Map view showing checked locations  
- Favourite locations (e.g. Home, Work)  
- History of recent air quality checks (with clear option)

---

## Tech Stack

### Frontend
- HTML  
- CSS  
- JavaScript  
- Leaflet (map visualisation)

### Backend
- Node.js  
- Express.js  
- SQLite (local database)

### APIs
- OpenWeather Air Pollution API  
- OpenWeather Geocoding API  

---

## How to Run the Project Locally

### 1. Clone or Download
Download the project files to your local machine.

---

### 2. Backend Setup
The backend handles all API communication and database operations. It also ensures that the OpenWeather API key is not exposed in the frontend.

```bash
cd backend
npm install
```

The OpenWeather API key is required to run the backend.  
For **privacy reasons**, the actual API key is **not included in this repository**.

The API key used for evaluation is provided **inside the presentation (PPTX)** as requested in the assignment instructions.

After setting the API key locally, start the backend server:

```bash
node server.js
```

If the backend starts successfully, the following message will appear in the terminal:

```text
AirGuard backend running on http://localhost:3001
```

(Optional quick test)

```bash
curl http://localhost:3001/api/health
```

Expected response:

```json
{"ok":true}
```

---

### 3. Frontend Setup
The frontend has no build step.

- Option A (simple): open `index.html` in your browser  
- Option B (recommended): run a small local server (avoids CORS / file restrictions)

From the project root folder:

```bash
npx serve .
```

Then open the shown local URL in your browser.

---

## Project Structure (Overview)

```text
AirGuard/
├── index.html
├── styles.css
├── app.js
├── README.md
├── DesktopView_1.jpeg
├── DeskstopView_2.jpeg
├── iPadView_1.png
├── iPadView_2.png
├── iPhoneView_1.png
├── iPhoneView_2.png
└── backend/
    ├── server.js
    ├── db.js
    ├── schema.sql
    ├── airguard.sqlite
    ├── routes/
    ├── services/
    └── package.json
```

---

## Screenshots (UI Overview)

The following screenshots demonstrate the responsive behaviour of the application across devices.

### Desktop View
- `DesktopView_1.jpeg`  
- `DeskstopView_2.jpeg`

### Tablet View (iPad)
- `iPadView_1.png`  
- `iPadView_2.png`

### Mobile View
- `iPhoneView_1.png`  
- `iPhoneView_2.png`

---

## Limitations

- Air quality data is model-based (OpenWeather) and may differ from local station measurements  
- Free API rate limits apply  
- No authentication or multi-user login system  
- The application is intended for informational purposes only

---

## Author

**Mohammed Suhan**  
Student ID: **102210577**  
IU International University of Applied Sciences