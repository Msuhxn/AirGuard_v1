// backend/server.js
const express = require("express");
const cors = require("cors");
const { initDb } = require("./db");

const aqRoutes = require("./routes/aq");
const favouritesRoutes = require("./routes/favourites");
const historyRoutes = require("./routes/history");
const userRoutes = require("./routes/user");
const geoRoutes = require("./routes/geo"); // 

initDb();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/aq", aqRoutes);
app.use("/api/favourites", favouritesRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/user", userRoutes);
app.use("/api/geo", geoRoutes); //

app.get("/api/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✅ AirGuard backend running on http://localhost:${PORT}`));
