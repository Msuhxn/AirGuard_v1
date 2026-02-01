// CONFIGURATION
const API_BASE = "http://localhost:3001/api";

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

function showLoading(btnSel) {
  const btn = $(btnSel);
  if (!btn) return;
  btn.disabled = true;
  btn.style.opacity = "0.7";
  const originalText = btn.textContent;
  btn.dataset.original = originalText;
  btn.textContent = "Processing...";
}

function hideLoading(btnSel) {
  const btn = $(btnSel);
  if (!btn) return;
  btn.disabled = false;
  btn.style.opacity = "1";
  if (btn.dataset.original) btn.textContent = btn.dataset.original;
}

// --- API LAYER ---
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
      alert("Connection error. Ensure backend is running.");
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
    $("#setupModal").classList.remove("hidden");
  }
}

async function handleCreateUser() {
  const name = $("#userName").value.trim();
  const age = Number($("#userAge").value);
  const group = document.querySelector('input[name="group"]:checked').value;

  if (!name || !age) return alert("Please fill in valid details.");

  showLoading("#btnSaveUser");
  const res = await apiCall("/user", "POST", { name, age, group_type: group });
  hideLoading("#btnSaveUser");

  if (res && res.ok) {
    $("#setupModal").classList.add("hidden");
    initUser();
  }
}

function updateUserUI() {
  const u = STATE.currentUser;
  if (!u) return;
  $("#userText").textContent = u.name;
  
  // Status Dot Logic based on group
  const dot = $(".statusDot");
  if (u.group_type === 'healthy') dot.style.background = 'var(--success)';
  else dot.style.background = 'var(--warning)';
}

// --- MAP & LOCATION ---
function initMap() {
  // Center roughly on Germany initially
  STATE.map = L.map("map", { zoomControl: false }).setView([51.16, 10.45], 6);
  
  // Dark matter tiles for the "Hacker" aesthetic
  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; OpenStreetMap & CartoDB',
    subdomains: "abcd",
    maxZoom: 19
  }).addTo(STATE.map);

  STATE.markersLayer = L.layerGroup().addTo(STATE.map);
  
  // Fix for map rendering inside CSS Grid/Flex
  setTimeout(() => { STATE.map.invalidateSize(); }, 500);
}

function updateMapMarkers(lat, lon, label) {
  STATE.markersLayer.clearLayers();
  
  // Glow effect circle
  L.circleMarker([lat, lon], {
    color: '#6366f1',
    fillColor: '#6366f1',
    fillOpacity: 0.2,
    radius: 30,
    weight: 0
  }).addTo(STATE.markersLayer);

  // The actual pin point
  L.circleMarker([lat, lon], {
    color: '#fff',
    fillColor: '#6366f1',
    fillOpacity: 1,
    radius: 6,
    weight: 2
  }).addTo(STATE.markersLayer)
    .bindPopup(`<b style="color:#000">${label}</b>`)
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
  $("#pm25Val").textContent = pollutants.pm25 ?? "—";
  $("#pm10Val").textContent = pollutants.pm10 ?? "—";
  $("#o3Val").textContent = pollutants.o3 ?? "—";

  const colors = { HIGH: "chipRisk", MEDIUM: "chipMod", OK: "chipGood" };
  $("#statusChip").className = `chip ${colors[risk.level] || "chipNeutral"}`;
  $("#statusChip").textContent = risk.label;

  $("#placeText").textContent = data.locationName || "Unknown Coordinates";
  
  // Clean up recommendation text
  const recEl = $("#recommendText");
  recEl.textContent = risk.recommendation;
  // If high risk, make text red
  recEl.style.color = risk.level === 'HIGH' ? 'var(--danger)' : 'var(--text)';

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
  showLoading("#btnLiveOnce");

  if (!navigator.geolocation) {
    alert("Geolocation not supported.");
    hideLoading("#btnLiveOnce");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      await checkAirQuality(pos.coords.latitude, pos.coords.longitude, "Live Position");
      hideLoading("#btnLiveOnce");
    },
    (err) => {
      console.error(err);
      alert("Location access denied.");
      hideLoading("#btnLiveOnce");
    },
    { enableHighAccuracy: true }
  );
}

// --- SEARCH ---
function handleSearchInput() {
  const q = $("#placeSearch").value.trim();
  const resultsBox = $("#placeResults");
  clearTimeout(STATE.searchTimer);

  if (q.length < 2) {
    resultsBox.classList.add("hidden");
    return;
  }

  STATE.searchTimer = setTimeout(async () => {
    const data = await apiCall(`/geo/search?q=${encodeURIComponent(q)}`);
    if (!data || !data.results || !data.results.length) {
      resultsBox.classList.add("hidden");
      return;
    }
    resultsBox.classList.remove("hidden");
    resultsBox.innerHTML = data.results
      .map(x => `<div class="searchItem" data-lat="${x.lat}" data-lon="${x.lon}">${x.name}</div>`)
      .join("");
  }, 350);
}

function handleSearchSelect(e) {
  const item = e.target.closest(".searchItem");
  if (!item) return;

  const lat = item.getAttribute("data-lat");
  const lon = item.getAttribute("data-lon");
  const name = item.textContent.trim();

  $("#favLat").value = lat; // No rounding needed for hidden input
  $("#favLon").value = lon;
  $("#favLabel").value = name.split(",")[0]; 

  checkAirQuality(lat, lon, name);

  $("#placeSearch").value = "";
  $("#placeResults").classList.add("hidden");
}

// --- FAVOURITES ---
async function loadFavourites() {
  const favs = (await apiCall("/favourites")) || [];
  const list = $("#favList");
  list.innerHTML = "";

  if(favs.length === 0) {
      list.innerHTML = '<div style="padding:10px; color:var(--muted); font-size:0.8rem">No favorites added yet.</div>';
      return;
  }

  favs.forEach((f) => {
    const item = document.createElement("div");
    item.className = "favItem";
    item.innerHTML = `
      <span>${f.label}</span>
      <span style="font-size:0.8em; opacity:0.6; color:var(--primary)">GO &rarr;</span>
    `;
    item.onclick = () => checkAirQuality(f.lat, f.lon, f.label);
    list.appendChild(item);
  });
}

async function addFavourite() {
  const label = $("#favLabel").value.trim();
  const lat = $("#favLat").value;
  const lon = $("#favLon").value;

  if (!label || !lat) return alert("Search for a place first!");
  await apiCall("/favourites", "POST", { label, lat: Number(lat), lon: Number(lon) });
  
  $("#favLabel").value = ""; 
  loadFavourites();
}

// --- HISTORY ---
async function loadHistory() {
  const hist = (await apiCall("/history")) || [];
  const list = $("#historyList");
  list.innerHTML = "";

  if(hist.length === 0) {
    list.innerHTML = '<div style="padding:10px; color:var(--muted); font-size:0.8rem">No recent history.</div>';
    return;
  }

  hist.slice(0, 20).forEach((h) => {
    const row = document.createElement("div");
    row.className = "histRow";
    const shortName = (h.location_name || "Unknown").split(',')[0];
    const time = new Date(h.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Determine color based on risk
    let riskColor = "var(--muted)";
    if(h.risk_level === "HIGH") riskColor = "var(--danger)";
    if(h.risk_level === "MEDIUM") riskColor = "var(--warning)";
    if(h.risk_level === "OK") riskColor = "var(--success)";

    row.innerHTML = `
      <div style="display:flex; flex-direction:column">
        <span style="font-weight:600; font-size:0.9rem">${shortName}</span>
        <span style="opacity:0.5; font-size:0.75em">${time}</span>
      </div>
      <div style="text-align:right">
        <span style="font-size:0.75em; font-weight:700; color:${riskColor}">${h.risk_level}</span>
      </div>
    `;
    row.onclick = () => checkAirQuality(h.lat, h.lon, "History Replay");
    list.appendChild(row);
  });
}

// --- EVENTS ---
function setupEventListeners() {
  $("#btnSaveUser").onclick = handleCreateUser;
  $("#userPill").onclick = () => $("#setupModal").classList.remove("hidden");
  $("#btnLiveOnce").onclick = getLiveLocation;

  $("#btnLiveToggle").onclick = () => {
    if (STATE.isLive) {
      clearInterval(STATE.liveTimer);
      STATE.isLive = false;
      $("#btnLiveToggle").innerHTML = 'Start Live Tracking';
      $("#btnLiveToggle").classList.add("btnGhost");
      $("#btnLiveToggle").classList.remove("btnPrimary");
    } else {
      getLiveLocation(); 
      STATE.liveTimer = setInterval(() => {
         if (navigator.geolocation) {
           navigator.geolocation.getCurrentPosition((pos) => {
             checkAirQuality(pos.coords.latitude, pos.coords.longitude, "Live Tracker");
           });
         }
      }, 60000);
      STATE.isLive = true;
      $("#btnLiveToggle").innerHTML = 'Stop Tracking';
      $("#btnLiveToggle").classList.remove("btnGhost");
      $("#btnLiveToggle").classList.add("btnPrimary"); // Make it pop when active
    }
  };

  $("#btnAddFav").onclick = addFavourite;
  
  $("#btnUseCurrentForFav").onclick = () => {
     if (!navigator.geolocation) return;
     navigator.geolocation.getCurrentPosition(async (pos) => {
        $("#favLat").value = pos.coords.latitude;
        $("#favLon").value = pos.coords.longitude;
        $("#favLabel").value = "My Location";
        $("#placeSearch").value = "Current GPS Coordinates";
     });
  };

  $("#btnClearHistory").onclick = async () => {
    if (!confirm("Delete all history logs permanently?")) return;
    const res = await apiCall("/history/clear", "DELETE");
    if (res && res.ok) {
        $("#historyList").innerHTML = "";
    } else {
        alert("Failed to clear database.");
    }
  };

  $("#placeSearch").addEventListener("input", handleSearchInput);
  $("#placeResults").addEventListener("click", handleSearchSelect);
  
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".searchWrapper")) $("#placeResults").classList.add("hidden");
  });
}

(async function main() {
  initMap();
  setupEventListeners();
  await initUser();
  await loadFavourites();
  await loadHistory();
})();