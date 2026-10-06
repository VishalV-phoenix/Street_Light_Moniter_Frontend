/**
 * OpenStreetMap Manager using Leaflet
 * Renders authentic OpenStreetMap tiles with multiple style layers (Standard, Light, Dark).
 */
class OpenStreetMapManager {
  constructor(containerId = "map") {
    this.containerId = containerId;
    this.currentThemeKey = "standard";

    // Center on city streets at zoom 17 (street level)
    this.initialCoords = [13.0827, 80.2707];
    this.initialZoom = 17;

    // OpenStreetMap Tile Layers
    this.themes = {
      standard: {
        name: "Standard",
        layer: L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }),
      },
      light: {
        name: "Light",
        layer: L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
          {
            maxZoom: 19,
            subdomains: "abcd",
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
          }
        ),
      },
      dark: {
        name: "Night",
        layer: L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
          {
            maxZoom: 19,
            subdomains: "abcd",
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
          }
        ),
      },
    };

    // Initialize Leaflet Map
    this.map = L.map(this.containerId, {
      center: this.initialCoords,
      zoom: this.initialZoom,
      zoomControl: false, // Handled by our custom styled zoom controls
      attributionControl: false,
    });

    // Add initial tile layer
    this.themes[this.currentThemeKey].layer.addTo(this.map);

    // Dynamic pole scale calculator: reduces icon size when zooming out
    const updatePoleScale = () => {
      const zoom = this.map.getZoom();
      let scale = 1.0;
      if (zoom >= 17) {
        scale = Math.min(1.35, 1.0 + (zoom - 17) * 0.14);
      } else {
        const diff = 17 - zoom;
        scale = Math.max(0.24, Math.pow(0.82, diff));
      }
      scale = parseFloat(scale.toFixed(3));
      document.documentElement.style.setProperty("--pole-scale", scale);
      document.body.classList.toggle("map-zoomed-out", zoom < 15);
    };

    this.map.on("zoom", updatePoleScale);
    this.map.on("zoomend", updatePoleScale);
    updatePoleScale();

    // Global reference for other scripts
    window.leafletMap = this.map;
    window.updatePoleScale = updatePoleScale;
  }

  setTheme(themeKey) {
    if (!this.themes[themeKey] || themeKey === this.currentThemeKey) return;

    this.map.removeLayer(this.themes[this.currentThemeKey].layer);
    this.themes[themeKey].layer.addTo(this.map);
    this.currentThemeKey = themeKey;
  }

  zoomIn() {
    this.map.zoomIn();
  }

  zoomOut() {
    this.map.zoomOut();
  }
}

// Global initialization
window.osmMap = null;
window.addEventListener("DOMContentLoaded", () => {
  window.osmMap = new OpenStreetMapManager("map");

  // Wire up theme buttons (Standard, Light, Dark)
  const buttons = document.querySelectorAll(".style-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      buttons.forEach((b) => b.classList.remove("active"));
      e.target.classList.add("active");
      const style = e.target.getAttribute("data-style");
      if (window.osmMap) {
        window.osmMap.setTheme(style);
      }
    });
  });

  // Wire up custom zoom buttons
  const zoomIn = document.getElementById("zoomIn");
  const zoomOut = document.getElementById("zoomOut");
  if (zoomIn && zoomOut) {
    zoomIn.addEventListener("click", () => {
      if (window.osmMap) {
        window.osmMap.zoomIn();
      }
    });
    zoomOut.addEventListener("click", () => {
      if (window.osmMap) {
        window.osmMap.zoomOut();
      }
    });
  }

  // Wire up collapsible monitor card
  const toggleBtn = document.getElementById("toggleMonitorBtn");
  const monitorCard = document.getElementById("monitorCard");
  if (toggleBtn && monitorCard) {
    toggleBtn.addEventListener("click", () => {
      monitorCard.classList.toggle("collapsed");
      toggleBtn.textContent = monitorCard.classList.contains("collapsed")
        ? "+"
        : "−";
    });
  }
});
