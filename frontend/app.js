// CONFIGURATION
const API_BASE = "http://localhost:3001/api";

const STATE = {
  currentUser: null,
  isLive: false,
  liveTimer: null,
  map: null,
  markersLayer: null,
  lastCoords: null,
  searchTimer: null
};

// --- UTILS ---
const $ = (sel) => document.querySelector(sel);

function showLoading(btnSel) {
  const btn = $(btnSel);
  if (btn) {
    btn.disabled = true;
    btn.style.opacity = "0.7";
    btn.textContent = "Loading...";
  }
}

function hideLoading(btnSel, originalText) {
  const btn = $(btnSel);
  if (btn) {
    btn.disabled = false;
    btn.style.opacity = "1";
    btn.textContent = originalText;
  }
}

// --- API LAYER ---
// ✅ FIXED: only sets Content-Type when we send a JSON body
async function apiCall(endpoint, method = "GET", body = null) {
  try {
    const options = { method, headers: {} };

    if (body !== null) {
      options.headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(body);
    }

    const res = await fetch(`${API_BASE}${endpoint}`, options);
    if (!res.ok) throw new Error(`API Error: ${res.status} ${res.statusText}`);
    return await res.json();
  } catch (err) {
    console.error(err);
    // fail silently for geo search
    if (!endpoint.includes("/geo/search")) {
      alert("Connection Error: Is the backend server running?");
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
  STATE.map = L.map("map").setView([51.505, -0.09], 13);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution: "&copy; OpenStreetMap &copy; CartoDB",
    subdomains: "abcd",
    maxZoom: 19
  }).addTo(STATE.map);

  STATE.markersLayer = L.layerGroup().addTo(STATE.map);
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

async function getLiveLocation() {
  showLoading("#btnLiveOnce");

  if (!navigator.geolocation) {
    alert("Geolocation is not supported by your browser.");
    hideLoading("#btnLiveOnce", "📍 Check Location");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude, longitude } = pos.coords;
      await checkAirQuality(latitude, longitude, "Live Location");
      hideLoading("#btnLiveOnce", "📍 Check Location");
    },
    (err) => {
      console.error(err);
      alert("Could not get location. Check permissions.");
      hideLoading("#btnLiveOnce", "📍 Check Location");
    },
    { enableHighAccuracy: true }
  );
}

// --- SEARCH ---
function handleSearchInput() {
  const q = $("#placeSearch").value.trim();
  const resultsBox = $("#placeResults");

  clearTimeout(STATE.searchTimer);

  // ✅ nicer: start from 2 chars
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
  }, 350);
}

function handleSearchSelect(e) {
  const item = e.target.closest(".searchItem");
  if (!item) return;

  const lat = item.getAttribute("data-lat");
  const lon = item.getAttribute("data-lon");
  const name = item.textContent.trim();

  $("#favLat").value = Number(lat).toFixed(6);
  $("#favLon").value = Number(lon).toFixed(6);

  if ($("#favLabel").value.trim() === "") {
    $("#favLabel").value = name.split(",")[0];
  }

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

    row.querySelector("button").onclick = () => checkAirQuality(h.lat, h.lon, "History");
    list.appendChild(row);
  });
}

// --- INITIALIZATION ---
function setupEventListeners() {
  $("#btnSaveUser").onclick = handleCreateUser;
  $("#userPill").onclick = () => $("#setupModal").classList.remove("hidden");

  $("#btnLiveOnce").onclick = getLiveLocation;

  $("#btnLiveToggle").onclick = () => {
    if (STATE.isLive) {
      clearInterval(STATE.liveTimer);
      STATE.isLive = false;
      $("#btnLiveToggle").textContent = "Start Live Mode";
      $("#btnLiveToggle").classList.remove("btnPrimary");
    } else {
      getLiveLocation();
      STATE.liveTimer = setInterval(get_extractLiveCoords, 60000);
      STATE.isLive = true;
      $("#btnLiveToggle").textContent = "Stop Live Mode";
      $("#btnLiveToggle").classList.add("btnPrimary");
    }
  };

  // fix: use same function (no duplicated location prompts)
  async function get_extractLiveCoords() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      await checkAirQuality(pos.coords.latitude, pos.coords.longitude, "Live Location");
    });
  }

  $("#btnAddFav").onclick = addFavourite;

  $("#btnUseCurrentForFav").onclick = () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      $("#favLat").value = pos.coords.latitude.toFixed(6);
      $("#favLon").value = pos.coords.longitude.toFixed(6);
    });
  };

  // Search listeners
  $("#placeSearch").addEventListener("input", handleSearchInput);
  $("#placeResults").addEventListener("click", handleSearchSelect);

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".searchWrapper")) {
      $("#placeResults").classList.add("hidden");
    }
  });
}

(async function main() {
  initMap();
  setupEventListeners();
  await initUser();
  await loadFavourites();
  await loadHistory();
})();