# AirGuard – Air Quality Monitoring Web Application

AirGuard is a web-based application developed to help users understand air quality in a simple and personalised way. Many existing air quality platforms only display raw pollution values, which can be difficult to interpret. AirGuard focuses on presenting air quality information in a clearer form by considering the user’s risk group and providing short health-related recommendations.

This project was developed as part of the module **DLBCSPJWD01 – Project: Web Development** at **IU International University of Applied Sciences**.

---

## Project Idea

The main idea behind AirGuard is to evaluate air quality data and translate it into meaningful information for everyday users. When starting the application, the user selects a risk group such as Normal, Asthma, Child, or Elderly. Based on this selection, the system analyses air pollution data and classifies the air quality as Good, Moderate, or Risky.

---

## Features

- Air quality check based on current GPS location  
- Location search using place names  
- Display of PM2.5, PM10, and O₃ values  
- User-based risk groups  
- Clear risk classification (Good, Moderate, Risky)  
- Short health recommendations  
- Map view showing checked locations  
- Favourite locations (e.g. Home, Work)  
- History of recent air quality checks  

---

## Technologies Used

### Frontend
- HTML  
- CSS  
- JavaScript  
- Leaflet (for map visualisation)

### Backend
- Node.js  
- Express.js  
- SQLite (local database)

### APIs
- OpenWeather Air Pollution API  
- OpenWeather Geocoding API  

---

## How the Application Works

1. The user selects a risk group when opening the application.  
2. A location is selected using GPS or the search function.  
3. Air pollution data is retrieved from the OpenWeather API.  
4. The pollution values are compared with WHO-inspired threshold values.  
5. The system displays a risk level together with a short recommendation.

---

## How to Run the Project Locally

### Backend
```bash
cd backend
npm install
export OPENWEATHER_KEY=MY_API_KEY
node server.js
