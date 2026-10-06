/**
 * Google Maps Road Canvas Renderer
 * Renders an authentic Google Maps-style straight horizontal road.
 */

class GoogleMapRoad {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      console.error(`Canvas with id "${canvasId}" not found.`);
      return;
    }
    this.ctx = this.canvas.getContext("2d");

    // Road styling themes
    this.themes = {
      city: {
        name: "City (White)",
        land: "#f1ede6",
        parcelBorder: "#e5e0d4",
        parcelFill: "#f8f6f0",
        parkFill: "#d7e8cd",
        parkBorder: "#c6dcba",
        sidewalk: "#e3dfd5",
        sidewalkBorder: "#d2cdc1",
        roadCasing: "#c5c9ce",
        roadSurface: "#ffffff",
        centerLine: "#f9ab00", // Google Maps amber center double line
        centerLineWidth: 2,
        laneDivider: "#dadce0",
        laneDividerWidth: 1.5,
        shoulderLine: "#f1f3f4",
        streetNameText: "#5f6368",
        streetNameHalo: "#ffffff",
        scaleText: "#5f6368",
      },
      highway: {
        name: "Highway (Yellow)",
        land: "#f1ede6",
        parcelBorder: "#e5e0d4",
        parcelFill: "#f8f6f0",
        parkFill: "#d7e8cd",
        parkBorder: "#c6dcba",
        sidewalk: "#e4e0d6",
        sidewalkBorder: "#d3cec2",
        roadCasing: "#f3b740", // Google Maps highway amber casing
        roadSurface: "#fed876", // Google Maps highway golden yellow
        centerLine: "#e29712",
        centerLineWidth: 2,
        laneDivider: "#ffffff",
        laneDividerWidth: 2,
        shoulderLine: "rgba(255, 255, 255, 0.7)",
        streetNameText: "#3c4043",
        streetNameHalo: "#fed876",
        scaleText: "#5f6368",
      },
      dark: {
        name: "Night (Dark)",
        land: "#212a35",
        parcelBorder: "#273342",
        parcelFill: "#242f3e",
        parkFill: "#1e3831",
        parkBorder: "#23493e",
        sidewalk: "#2a3644",
        sidewalkBorder: "#344355",
        roadCasing: "#465261",
        roadSurface: "#38414e",
        centerLine: "#fbbc04",
        centerLineWidth: 2,
        laneDivider: "#515f72",
        laneDividerWidth: 1.5,
        shoulderLine: "#445060",
        streetNameText: "#9aa0a6",
        streetNameHalo: "#38414e",
        scaleText: "#9aa0a6",
      },
    };

    this.currentThemeKey = "city";
    this.roadHeight = 150; // Total road width in pixels (perpendicular to travel)
    this.sidewalkWidth = 18;
    this.roadName = "Grand Avenue";
    this.zoomLevel = 1.0;

    // Surrounding landmarks/parcels for authentic Google Maps look
    this.parcels = [];
    this.generateParcels();

    // Event listeners
    window.addEventListener("resize", () => this.resize());
    this.resize();
  }

  get currentTheme() {
    return this.themes[this.currentThemeKey];
  }

  setTheme(themeKey) {
    if (this.themes[themeKey]) {
      this.currentThemeKey = themeKey;
      this.render();
    }
  }

  generateParcels() {
    // Generate pseudo-random subtle parcels and green areas along the road
    this.parcels = [];
    const seedWidths = [140, 220, 180, 260, 160, 240, 300, 190];
    let topX = 40;
    let botX = 20;

    for (let i = 0; i < 20; i++) {
      const wTop = seedWidths[i % seedWidths.length];
      const isTopPark = i % 5 === 2;
      this.parcels.push({
        side: "top",
        x: topX,
        width: wTop,
        height: 120 + (i % 3) * 30,
        isPark: isTopPark,
      });
      topX += wTop + 24;

      const wBot = seedWidths[(i + 3) % seedWidths.length];
      const isBotPark = i % 5 === 4;
      this.parcels.push({
        side: "bottom",
        x: botX,
        width: wBot,
        height: 110 + (i % 4) * 25,
        isPark: isBotPark,
      });
      botX += wBot + 28;
    }
  }

  resize() {
    this.dpr = window.devicePixelRatio || 1;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.ctx.resetTransform();
    this.ctx.scale(this.dpr, this.dpr);

    this.render();
  }

  render() {
    const ctx = this.ctx;
    const theme = this.currentTheme;
    const w = this.width;
    const h = this.height;
    const centerY = h / 2;
    const halfRoad = this.roadHeight / 2;

    const roadTopY = centerY - halfRoad;
    const roadBottomY = centerY + halfRoad;
    const sidewalkTopY = roadTopY - this.sidewalkWidth;
    const sidewalkBottomY = roadBottomY + this.sidewalkWidth;

    // 1. Draw Land / Terrain Background
    ctx.fillStyle = theme.land;
    ctx.fillRect(0, 0, w, h);

    // 2. Draw Google Maps parcels and subtle park zones
    this.drawParcels(ctx, theme, centerY, roadTopY, roadBottomY);

    // 3. Draw Sidewalks (walkways bordering the road)
    this.drawSidewalks(
      ctx,
      theme,
      w,
      sidewalkTopY,
      roadTopY,
      roadBottomY,
      sidewalkBottomY,
    );

    // 4. Draw Google Maps Road Casing (outer border stroke)
    // In Google Maps, roads have a solid outline along both edges
    ctx.fillStyle = theme.roadCasing;
    ctx.fillRect(0, roadTopY - 2, w, this.roadHeight + 4);

    // 5. Draw Road Surface (fill)
    ctx.fillStyle = theme.roadSurface;
    ctx.fillRect(0, roadTopY, w, this.roadHeight);

    // 6. Draw Shoulder Lines (solid edge guidelines)
    ctx.strokeStyle = theme.shoulderLine;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(0, roadTopY + 8);
    ctx.lineTo(w, roadTopY + 8);
    ctx.moveTo(0, roadBottomY - 8);
    ctx.lineTo(w, roadBottomY - 8);
    ctx.stroke();

    // 7. Draw Lane Dividers (dashed lines for 4 lanes: 2 each direction)
    const laneHeight = this.roadHeight / 4;
    ctx.strokeStyle = theme.laneDivider;
    ctx.lineWidth = theme.laneDividerWidth;
    ctx.setLineDash([18, 14]); // Google Maps style dash

    // Lane 1 & 2 divider (upper westbound lanes)
    ctx.beginPath();
    ctx.moveTo(0, roadTopY + laneHeight);
    ctx.lineTo(w, roadTopY + laneHeight);
    ctx.stroke();

    // Lane 3 & 4 divider (lower eastbound lanes)
    ctx.beginPath();
    ctx.moveTo(0, roadBottomY - laneHeight);
    ctx.lineTo(w, roadBottomY - laneHeight);
    ctx.stroke();

    // 8. Draw Center Divider (Double Solid Amber Line - Signature Google Maps feature)
    ctx.setLineDash([]);
    ctx.strokeStyle = theme.centerLine;
    ctx.lineWidth = theme.centerLineWidth;

    const medianGap = 3.5;
    ctx.beginPath();
    ctx.moveTo(0, centerY - medianGap);
    ctx.lineTo(w, centerY - medianGap);
    ctx.moveTo(0, centerY + medianGap);
    ctx.lineTo(w, centerY + medianGap);
    ctx.stroke();

    // 9. Draw Google Maps Street Label
    this.drawStreetLabels(ctx, theme, w, centerY, roadTopY, roadBottomY);
  }

  drawParcels(ctx, theme, centerY, roadTopY, roadBottomY) {
    const sidewalkBuffer = this.sidewalkWidth + 14;

    this.parcels.forEach((p) => {
      if (p.side === "top") {
        const y = roadTopY - sidewalkBuffer - p.height;
        ctx.fillStyle = p.isPark ? theme.parkFill : theme.parcelFill;
        ctx.strokeStyle = p.isPark ? theme.parkBorder : theme.parcelBorder;
        ctx.lineWidth = 1;

        this.roundRect(ctx, p.x, y, p.width, p.height, 4);
        ctx.fill();
        ctx.stroke();
      } else {
        const y = roadBottomY + sidewalkBuffer;
        ctx.fillStyle = p.isPark ? theme.parkFill : theme.parcelFill;
        ctx.strokeStyle = p.isPark ? theme.parkBorder : theme.parcelBorder;
        ctx.lineWidth = 1;

        this.roundRect(ctx, p.x, y, p.width, p.height, 4);
        ctx.fill();
        ctx.stroke();
      }
    });
  }

  drawSidewalks(
    ctx,
    theme,
    w,
    sidewalkTopY,
    roadTopY,
    roadBottomY,
    sidewalkBottomY,
  ) {
    // Upper Sidewalk
    ctx.fillStyle = theme.sidewalk;
    ctx.fillRect(0, sidewalkTopY, w, this.sidewalkWidth);

    // Upper Sidewalk Outer Curb Line
    ctx.strokeStyle = theme.sidewalkBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, sidewalkTopY);
    ctx.lineTo(w, sidewalkTopY);
    ctx.stroke();

    // Lower Sidewalk
    ctx.fillStyle = theme.sidewalk;
    ctx.fillRect(0, roadBottomY, w, this.sidewalkWidth);

    // Lower Sidewalk Outer Curb Line
    ctx.strokeStyle = theme.sidewalkBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, sidewalkBottomY);
    ctx.lineTo(w, sidewalkBottomY);
    ctx.stroke();
  }

  drawStreetLabels(ctx, theme, w, centerY, roadTopY, roadBottomY) {
    // Google Maps street typography:
    // Centered or spaced along the road with white/fill halo
    const step = 480;
    const startX = (w % step) / 2 + 120;

    ctx.font =
      "500 13px 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let x = startX; x < w; x += step) {
      // Westbound label (top side)
      const topLabelY = centerY - this.roadHeight / 4;
      this.drawHaloText(
        ctx,
        `${this.roadName}  ◀`,
        x,
        topLabelY,
        theme.streetNameText,
        theme.streetNameHalo,
      );

      // Eastbound label (bottom side)
      const botLabelY = centerY + this.roadHeight / 4;
      this.drawHaloText(
        ctx,
        `▶  ${this.roadName}`,
        x + step / 2,
        botLabelY,
        theme.streetNameText,
        theme.streetNameHalo,
      );
    }
  }

  drawHaloText(ctx, text, x, y, textColor, haloColor) {
    ctx.save();
    ctx.lineJoin = "round";
    ctx.miterLimit = 2;
    ctx.strokeStyle = haloColor;
    ctx.lineWidth = 4;
    ctx.strokeText(text, x, y);

    ctx.fillStyle = textColor;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  roundRect(ctx, x, y, w, h, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}

// Global initialization
window.roadMap = null;
window.addEventListener("DOMContentLoaded", () => {
  window.roadMap = new GoogleMapRoad("roadCanvas");

  // Wire up theme buttons
  const buttons = document.querySelectorAll(".style-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      buttons.forEach((b) => b.classList.remove("active"));
      e.target.classList.add("active");
      const style = e.target.getAttribute("data-style");
      if (window.roadMap) {
        window.roadMap.setTheme(style);
      }
    });
  });

  // Wire up zoom buttons (visual feedback)
  const zoomIn = document.getElementById("zoomIn");
  const zoomOut = document.getElementById("zoomOut");
  if (zoomIn && zoomOut) {
    zoomIn.addEventListener("click", () => {
      if (window.roadMap) {
        window.roadMap.roadHeight = Math.min(
          240,
          window.roadMap.roadHeight + 15,
        );
        window.roadMap.render();
      }
    });
    zoomOut.addEventListener("click", () => {
      if (window.roadMap) {
        window.roadMap.roadHeight = Math.max(
          100,
          window.roadMap.roadHeight - 15,
        );
        window.roadMap.render();
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
