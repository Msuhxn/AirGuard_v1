// CONFIGURATION
const API_BASE = "http://localhost:3001/api";

// I used a global STATE object to keep track of variables 
// that change over time. This avoids having "magic variables" floating around.
const STATE = {
  currentUser: null,
  isLive: false,
  liveTimer: null,
  map: null,
  markersLayer: null,
  searchTimer: null
};

// --- UTILS ---
const $ = (sel) => document.querySelector(sel);

// This function handles the button loading state.
// Since my HTML uses <span> tags inside buttons now, I can't just set textContent 
// or it deletes the spinner. I toggle the classes instead.
function showLoading(btnSel) {
  const btn = $(btnSel);
  if (!btn) return;
  
  btn.disabled = true;
  btn.style.opacity = "0.7";
  
  // Find the text and loader spans
  const textSpan = btn.querySelector(".btnText");
  const loader = btn.querySelector(".loader");
  
  if (textSpan) textSpan.textContent = "Processing...";
  if (loader) loader.classList.remove("hidden");
}

function hideLoading(btnSel, originalText) {
  const btn = $(btnSel);
  if (!btn) return;

  btn.disabled = false;
  btn.style.opacity = "1";

  const textSpan = btn.querySelector(".btnText");
  const loader = btn.querySelector(".loader");

  if (textSpan) textSpan.textContent = originalText;
  if (loader) loader.classList.add("hidden");
}

// --- API LAYER ---
// I made this a generic function so I don't have to write 'fetch' 20 times.
async function apiCall(endpoint, method = "GET", body = null) {
  try {
    const options = { method, headers: {} };

    if (body !== null) {
      options.headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(body);
    }

    const res = await fetch(`${API_BASE}${endpoint}`, options);
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(err);
    if (!endpoint.includes("/geo/search")) {
      alert("Server Connection Error. Is the backend running?");
    }
    return null;
  }
}

// --- CORE FUNCTIONS ---
async function initUser() {
  const data = await apiCall("/user/current");
  if (data && data.currentUser) {
    STATE.currentUser = data.currentUser;
    updateUserUI();
  } else {
    // If no user, show the modal
    $("#setupModal").classList.remove("hidden");
  }
}

async function handleCreateUser() {
  const name = $("#userName").value.trim();
  const age = Number($("#userAge").value);
  const group = document.querySelector('input[name="group"]:checked').value;

  if (!name || !age) return alert("Please fill in valid details.");

  showLoading("#btnSaveUser");
  
  // POST request to create user
  const res = await apiCall("/user", "POST", { name, age, group_type: group });
  
  hideLoading("#btnSaveUser", "Start Monitoring");

  if (res && res.ok) {
    $("#setupModal").classList.add("hidden");
    initUser();
  }
}

function updateUserUI() {
  const u = STATE.currentUser;
  if (!u) return;
  $("#userText").textContent = `${u.name} (${u.group_type.toUpperCase()})`;
}

// --- MAP & LOCATION ---
function initMap() {
  // : Leaflet requires a div with an ID of 'map'.
  // I set the default view to London, but it updates as soon as we search.
  STATE.map = L.map("map").setView([51.505, -0.09], 13);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution: "&copy; OpenStreetMap &copy; CartoDB",
    subdomains: "abcd",
    maxZoom: 19
  }).addTo(STATE.map);

  STATE.markersLayer = L.layerGroup().addTo(STATE.map);
  
  // Mobile Fix: Sometimes the map renders gray tiles if the container size changes.
  // This forces Leaflet to recalculate the size after a short delay.
  setTimeout(() => { STATE.map.invalidateSize(); }, 500);
}

function updateMapMarkers(lat, lon, label) {
  STATE.markersLayer.clearLayers();

  L.marker([lat, lon])
    .addTo(STATE.markersLayer)
    .bindPopup(`<b>${label}</b><br>AQI Checked Here`)
    .openPopup();

  STATE.map.setView([lat, lon], 13);
}

// --- APP LOGIC ---
async function checkAirQuality(lat, lon, label = "Current Location") {
  $("#statusChip").className = "chip chipNeutral";
  $("#statusChip").textContent = "Analyzing...";

  const data = await apiCall(`/aq?lat=${lat}&lon=${lon}`);
  if (!data) return;

  renderHero(data);
  updateMapMarkers(lat, lon, label);
  loadHistory();
}

function renderHero(data) {
  const { pollutants, risk } = data;

  // Using nullish coalescing (??) to show dashes if data is missing
  $("#pm25Val").textContent = pollutants.pm25 ?? "—";
  $("#pm10Val").textContent = pollutants.pm10 ?? "—";
  $("#o3Val").textContent = pollutants.o3 ?? "—";

  const colors = { HIGH: "chipRisk", MEDIUM: "chipMod", OK: "chipGood" };
  $("#statusChip").className = `chip ${colors[risk.level] || "chipNeutral"}`;
  $("#statusChip").textContent = risk.label;

  $("#placeText").textContent = data.locationName || "Unknown Location";
  $("#recommendText").textContent = risk.recommendation;

  const ul = $("#reasonsList");
  ul.innerHTML = "";
  (risk.reasons || []).forEach((r) => {
    const li = document.createElement("li");
    li.textContent = `• ${r}`;
    ul.appendChild(li);
  });
}

// --- GEOLOCATION ---
async function getLiveLocation() {
  const btn = $("#btnLiveOnce");
  // Manual text update because this button doesn't have the span structure
  btn.disabled = true; 
  btn.innerHTML = "Locating...";

  if (!navigator.geolocation) {
    alert("Geolocation is not supported by your browser.");
    btn.disabled = false;
    btn.innerHTML = '<span class="icon">📍</span> Check Location';
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude, longitude } = pos.coords;
      await checkAirQuality(latitude, longitude, "Live Location");
      
      btn.disabled = false;
      btn.innerHTML = '<span class="icon">📍</span> Check Location';
    },
    (err) => {
      console.error(err);
      alert("Could not get location. Please allow permissions.");
      btn.disabled = false;
      btn.innerHTML = '<span class="icon">📍</span> Check Location';
    },
    { enableHighAccuracy: true }
  );
}

// --- SEARCH ---
function handleSearchInput() {
  const q = $("#placeSearch").value.trim();
  const resultsBox = $("#placeResults");

  // Debouncing: I clear the previous timer so we don't spam the API 
  // with a request for every single letter typed.
  clearTimeout(STATE.searchTimer);

  if (q.length < 2) {
    resultsBox.classList.add("hidden");
    resultsBox.innerHTML = "";
    return;
  }

  STATE.searchTimer = setTimeout(async () => {
    const data = await apiCall(`/geo/search?q=${encodeURIComponent(q)}`);

    if (!data || !data.results || !data.results.length) {
      resultsBox.classList.add("hidden");
      resultsBox.innerHTML = "";
      return;
    }

    resultsBox.classList.remove("hidden");
    resultsBox.innerHTML = data.results
      .map(
        (x) => `<div class="searchItem" data-lat="${x.lat}" data-lon="${x.lon}">
          ${x.name}
        </div>`
      )
      .join("");
  }, 350); // Wait 350ms after typing stops
}

function handleSearchSelect(e) {
  // Use closest() to handle clicks on child elements of the search item
  const item = e.target.closest(".searchItem");
  if (!item) return;

  const lat = item.getAttribute("data-lat");
  const lon = item.getAttribute("data-lon");
  const name = item.textContent.trim();

  // Populate the favorites form
  $("#favLat").value = Number(lat).toFixed(6);
  $("#favLon").value = Number(lon).toFixed(6);

  if ($("#favLabel").value.trim() === "") {
    $("#favLabel").value = name.split(",")[0];
  }

  // Update UI and hide results
  $("#placeSearch").value = name;
  $("#placeResults").classList.add("hidden");
}

// --- FAVOURITES ---
async function loadFavourites() {
  const favs = (await apiCall("/favourites")) || [];
  const list = $("#favList");
  list.innerHTML = "";

  if (favs.length === 0) {
    list.innerHTML = "<div class='muted small'>No favourites saved yet.</div>";
    return;
  }

  favs.forEach((f) => {
    const item = document.createElement("div");
    item.className = "favItem";
    item.innerHTML = `
      <div>
        <div style="font-weight:700">${f.label}</div>
        <div class="muted small">${Number(f.lat).toFixed(3)}, ${Number(f.lon).toFixed(3)}</div>
      </div>
      <button class="iconBtn">Check</button>
    `;
    item.onclick = () => checkAirQuality(f.lat, f.lon, f.label);
    list.appendChild(item);
  });
}

async function addFavourite() {
  const label = $("#favLabel").value.trim();
  const lat = $("#favLat").value;
  const lon = $("#favLon").value;

  if (!label || !lat || !lon) return alert("Fill all fields");

  await apiCall("/favourites", "POST", { label, lat: Number(lat), lon: Number(lon) });

  // Clear inputs
  $("#favLabel").value = "";
  $("#favLat").value = "";
  $("#favLon").value = "";
  $("#placeSearch").value = "";

  loadFavourites();
}

// --- HISTORY ---
async function loadHistory() {
  const hist = (await apiCall("/history")) || [];
  const list = $("#historyList");
  list.innerHTML = "";

  // Slice(0, 10) ensures we only show the last 10 entries to keep the UI clean
  hist.slice(0, 10).forEach((h) => {
    const row = document.createElement("div");
    row.className = "histRow";
    const time = new Date(h.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    row.innerHTML = `
      <div>
        <div style="font-weight:600">${h.location_name || "Coords"}</div>
        <div class="muted small">${time} • Risk: ${h.risk_level}</div>
      </div>
      <button class="iconBtn">Re-check</button>
    `;

    // The button click triggers a re-check of that location
    row.querySelector("button").onclick = () => checkAirQuality(h.lat, h.lon, "History");
    list.appendChild(row);
  });
}

// --- INITIALIZATION ---
function setupEventListeners() {
  $("#btnSaveUser").onclick = handleCreateUser;
  $("#userPill").onclick = () => $("#setupModal").classList.remove("hidden");

  $("#btnLiveOnce").onclick = getLiveLocation;

  // Logic for the Live Toggle button
  $("#btnLiveToggle").onclick = () => {
    if (STATE.isLive) {
      clearInterval(STATE.liveTimer);
      STATE.isLive = false;
      $("#btnLiveToggle").textContent = "Start Live Mode";
      $("#btnLiveToggle").classList.remove("btnPrimary");
    } else {
      getLiveLocation(); // Check immediately
      // Set interval for every 60 seconds
      STATE.liveTimer = setInterval(() => {
         if (navigator.geolocation) {
           navigator.geolocation.getCurrentPosition((pos) => {
             checkAirQuality(pos.coords.latitude, pos.coords.longitude, "Live Location");
           });
         }
      }, 60000);
      
      STATE.isLive = true;
      $("#btnLiveToggle").textContent = "Stop Live Mode";
      $("#btnLiveToggle").classList.add("btnPrimary");
    }
  };

  $("#btnAddFav").onclick = addFavourite;

  $("#btnUseCurrentForFav").onclick = () => {
    if (!navigator.geolocation) return alert("Geolocation permission needed");
    navigator.geolocation.getCurrentPosition((pos) => {
      $("#favLat").value = pos.coords.latitude.toFixed(6);
      $("#favLon").value = pos.coords.longitude.toFixed(6);
    });
  };

  // Search input listeners
  $("#placeSearch").addEventListener("input", handleSearchInput);
  $("#placeResults").addEventListener("click", handleSearchSelect);

  // Close search results if clicking outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".searchWrapper")) {
      $("#placeResults").classList.add("hidden");
    }
  });
}

// Main IIFE (Immediately Invoked Function Expression) to start the app
(async function main() {
  initMap();
  setupEventListeners();
  await initUser();
  await loadFavourites();
  await loadHistory();
})();