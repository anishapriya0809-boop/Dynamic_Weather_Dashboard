const API_KEY = "b29f122d2730221f1a11fd60dc9f9d22";

const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const locBtn = document.getElementById("locBtn");
const weatherContainer = document.getElementById("weather-container");
const extraInfo = document.getElementById("extra-info");
const forecastContainer = document.getElementById("forecast-container");
const overlay = document.getElementById("overlay");
const errorBox = document.getElementById("errorBox");

function showOverlay(msg = "Loading...") {
  overlay.textContent = msg;
  overlay.classList.remove("hidden");
  errorBox.classList.add("hidden");
}
function showError(msg) {
  overlay.classList.add("hidden");
  errorBox.textContent = msg;
  errorBox.classList.remove("hidden");
}
function hideOverlay() {
  overlay.classList.add("hidden");
  errorBox.classList.add("hidden");
}

searchBtn.addEventListener("click", () => {
  const city = cityInput.value.trim();
  if (city) fetchWeatherByCity(city);
});

locBtn.addEventListener("click", fetchWeatherByLocation);

async function fetchWeatherByCity(city) {
  showOverlay();
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
      city
    )}&appid=${API_KEY}&units=metric`;
    const res = await fetch(url);
    const current = await res.json();
    if (!res.ok || current.cod !== 200)
      throw new Error(current.message || "City not found");
    fetchForecast(current.coord.lat, current.coord.lon, current);
  } catch (err) {
    showError(err.message);
  }
}

function fetchWeatherByLocation() {
  if (!navigator.geolocation) return showError("Geolocation not supported");
  showOverlay("Fetching your location...");
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude, longitude } = pos.coords;
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric`
      );
      const current = await res.json();
      if (!res.ok) throw new Error("Failed to fetch weather");
      fetchForecast(latitude, longitude, current);
    },
    () => showError("Location access denied")
  );
}

async function fetchForecast(lat, lon, current) {
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
    );
    if (!res.ok) throw new Error("Forecast not available");
    const data = await res.json();
    const aqiRes = await fetch(
      `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`
    );
    const aqiData = await aqiRes.json();
    renderWeather(current, data, aqiData);
    hideOverlay();
  } catch (err) {
    showError(err.message);
  }
}

function renderWeather(current, data, aqiData) {
  const { name, sys, main, weather } = current;
  const desc = weather[0].description;
  const icon = weather[0].icon;

  if (desc.includes("cloud"))
    document.body.style.backgroundImage = "url('assets/bg-cloudy.jpg')";
  else if (desc.includes("rain"))
    document.body.style.backgroundImage = "url('assets/bg-rainy.jpg')";
  else if (desc.includes("clear"))
    document.body.style.backgroundImage = "url('assets/bg-sunny.jpg')";
  else document.body.style.backgroundImage = "url('assets/bg-default.jpg')";

  weatherContainer.innerHTML = `
    <h2>${name}, ${sys.country}</h2>
    <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${desc}">
    <h3>${Math.round(main.temp)}°C</h3>
    <p>${desc}</p>
  `;

  renderExtraInfo(current.main, aqiData);
  renderForecast(data.list);
}

function getAQIDescription(aqi) {
  switch (aqi) {
    case 1: return "Good 😊";
    case 2: return "Fair 🙂";
    case 3: return "Moderate 😐";
    case 4: return "Poor 😷";
    case 5: return "Very Poor ☠️";
    default: return "Unknown";
  }
}

function renderExtraInfo(main, aqiData) {
  const aqiIndex = aqiData.list[0].main.aqi;
  const aqiDesc = getAQIDescription(aqiIndex);
  const info = [
    { icon: "icons/thermometer.svg", label: "Feels Like", value: `${Math.round(main.feels_like)}°C` },
    { icon: "icons/humidity.svg", label: "Humidity", value: `${main.humidity}%` },
    { icon: "icons/pressure.svg", label: "Pressure", value: `${main.pressure} hPa` },
    { icon: "icons/air-quality.svg", label: "Air Quality", value: aqiDesc }
  ];
  extraInfo.innerHTML = "";
  info.forEach(item => {
    extraInfo.innerHTML += `
      <div class="info-card">
        <img src="${item.icon}" alt="${item.label}">
        <div class="label">${item.label}</div>
        <div class="value">${item.value}</div>
      </div>
    `;
  });
}

function renderForecast(list) {
  forecastContainer.innerHTML = "";
  const dailyData = {};
  list.forEach(item => {
    const date = new Date(item.dt * 1000).toLocaleDateString(undefined, { weekday: "short" });
    if (!dailyData[date]) {
      dailyData[date] = { temps: [], icon: item.weather[0].icon };
    }
    dailyData[date].temps.push(item.main.temp);
  });
  const days = Object.entries(dailyData).slice(0, 5);
  days.forEach(([day, data]) => {
    const min = Math.round(Math.min(...data.temps));
    const max = Math.round(Math.max(...data.temps));
    forecastContainer.innerHTML += `
      <div class="forecast-card">
        <div class="day">${day}</div>
        <img src="https://openweathermap.org/img/wn/${data.icon}.png" alt="">
        <div class="temp">${min}° / ${max}°</div>
      </div>
    `;
  });
}
