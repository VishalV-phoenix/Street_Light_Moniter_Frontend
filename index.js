/**
 * MapPoleManager
 * Handles Edit/Save mode, drag-and-drop from table to OpenStreetMap (Leaflet),
 * geographic coordinates persistence, dragging markers on OpenStreetMap,
 * removal via 'x' button, hover node details tooltip,
 * notification bell for fault alerts, and sidebar active/fault filtering.
 */
class MapPoleManager {
  constructor() {
    this.isEditMode = false;
    this.currentFilter = "all"; // 'all' | 'active' | 'fault'
    this.nodeDataStore = {};
    this.markers = {}; // Leaflet markers keyed by nodeId
    this.editBtn = document.getElementById("editModeBtn");
    this.banner = document.getElementById("editModeBanner");
    this.tooltip = document.getElementById("poleTooltip");

    // Load saved positions from localStorage
    try {
      this.polePositions = JSON.parse(
        localStorage.getItem("street_light_pole_positions") || "{}"
      );
      // Clean up any legacy pixel coordinates if present
      for (const id in this.polePositions) {
        if (this.polePositions[id].lat === undefined) {
          delete this.polePositions[id];
        }
      }
    } catch (e) {
      this.polePositions = {};
    }

    this.init();
  }

  init() {
    // Edit/Save toggle button
    if (this.editBtn) {
      this.editBtn.addEventListener("click", () => this.toggleEditMode());
    }

    // Notification bell buttons (in map controls and in sidebar header)
    const notifyBellBtn = document.getElementById("notifyBellBtn");
    const sidebarBellBtn = document.getElementById("sidebarBellBtn");
    const closeNotifyBtn = document.getElementById("closeNotifyPanelBtn");
    const faultNotifyPanel = document.getElementById("faultNotifyPanel");

    const openFaultsView = () => {
      // 1. Filter sidebar to show only fault ones
      this.setFilter("fault");

      // 2. Expand monitor card if collapsed
      const monitorCard = document.getElementById("monitorCard");
      const toggleBtn = document.getElementById("toggleMonitorBtn");
      if (monitorCard && monitorCard.classList.contains("collapsed")) {
        monitorCard.classList.remove("collapsed");
        if (toggleBtn) toggleBtn.textContent = "−";
      }

      // 3. Toggle/show fault notifications panel
      if (faultNotifyPanel) {
        this.renderFaultNotifications();
        const isVisible = faultNotifyPanel.style.display !== "none";
        faultNotifyPanel.style.display = isVisible ? "none" : "flex";
      }
    };

    if (notifyBellBtn) notifyBellBtn.addEventListener("click", openFaultsView);
    if (sidebarBellBtn) sidebarBellBtn.addEventListener("click", openFaultsView);
    if (closeNotifyBtn && faultNotifyPanel) {
      closeNotifyBtn.addEventListener("click", () => {
        faultNotifyPanel.style.display = "none";
      });
    }

    // Filter tabs in sidebar
    const tabAll = document.getElementById("tabAll");
    const tabActive = document.getElementById("tabActive");
    const tabFault = document.getElementById("tabFault");
    const filterBtnActive = document.getElementById("filterBtnActive");
    const filterBtnFault = document.getElementById("filterBtnFault");

    if (tabAll) tabAll.addEventListener("click", () => this.setFilter("all"));
    if (tabActive) tabActive.addEventListener("click", () => this.setFilter("active"));
    if (tabFault) tabFault.addEventListener("click", () => this.setFilter("fault"));

    if (filterBtnActive) {
      filterBtnActive.addEventListener("click", () => {
        this.setFilter(this.currentFilter === "active" ? "all" : "active");
      });
    }
    if (filterBtnFault) {
      filterBtnFault.addEventListener("click", () => {
        this.setFilter(this.currentFilter === "fault" ? "all" : "fault");
      });
    }

    // Unified Dragover and Drop handling onto OpenStreetMap
    document.addEventListener("dragover", (e) => {
      if (this.isEditMode) {
        if (!e.target.closest("#monitorCard") && !e.target.closest("#faultNotifyPanel")) {
          e.preventDefault();
          if (e.dataTransfer) {
            e.dataTransfer.dropEffect = "move";
          }
        }
      }
    });

    document.addEventListener("drop", (e) => {
      if (!this.isEditMode) return;
      if (e.target.closest("#monitorCard") || e.target.closest("#faultNotifyPanel")) return;

      const nodeId =
        e.dataTransfer.getData("application/x-pole-id") ||
        e.dataTransfer.getData("text/plain");

      if (nodeId && this.nodeDataStore[nodeId] && window.leafletMap) {
        e.preventDefault();
        const latlng = window.leafletMap.mouseEventToLatLng(e);
        this.placePole(nodeId, latlng.lat, latlng.lng);
      }
    });

    // Hide tooltip on window scroll or resize
    window.addEventListener("scroll", () => this.hideTooltip(), true);
    window.addEventListener("resize", () => this.hideTooltip());
  }

  setFilter(filter) {
    this.currentFilter = filter;

    // Update tab buttons
    const tabs = {
      all: document.getElementById("tabAll"),
      active: document.getElementById("tabActive"),
      fault: document.getElementById("tabFault"),
    };
    for (const key in tabs) {
      if (tabs[key]) {
        tabs[key].classList.toggle("active", key === filter);
      }
    }

    // Update summary pills
    const activePill = document.getElementById("filterBtnActive");
    const faultPill = document.getElementById("filterBtnFault");
    if (activePill) activePill.classList.toggle("selected", filter === "active");
    if (faultPill) faultPill.classList.toggle("selected", filter === "fault");

    // Filter table rows
    const rows = document.querySelectorAll("tr[data-node-id]");
    rows.forEach((row) => {
      const status = row.getAttribute("data-status");
      if (filter === "all") {
        row.style.display = "";
      } else if (filter === "active") {
        row.style.display = status === "active" ? "" : "none";
      } else if (filter === "fault") {
        row.style.display = status === "fault" ? "" : "none";
      }
    });
  }

  renderFaultNotifications() {
    const list = document.getElementById("faultNotifyList");
    if (!list) return;

    list.innerHTML = "";

    const faultNodes = Object.values(this.nodeDataStore).filter((node) => {
      return String(node.node_status).trim().toLowerCase() !== "live";
    });

    if (faultNodes.length === 0) {
      list.innerHTML = `
        <div class="notify-empty-state">
          <span style="font-size: 26px;">✅</span>
          <strong>All Street Lights Operational</strong>
          <span>No fault or offline devices detected.</span>
        </div>
      `;
      return;
    }

    faultNodes.forEach((node) => {
      const card = document.createElement("div");
      card.className = "notify-fault-card";

      const isPlaced = this.isPolePlaced(node.node_id);
      const pos = this.polePositions[node.node_id];

      card.innerHTML = `
        <div class="fault-card-head">
          <span class="fault-card-id">
            <span>🚨</span>
            Pole #${node.node_id}
          </span>
          <span class="fault-badge-tag">${node.node_status || "FAULT"}</span>
        </div>
        <div class="fault-card-meta">
          <div><strong>Last Active:</strong> ${node.formattedLastBeat || node.last_beat || "Unknown"}</div>
          <div><strong>MAC:</strong> ${node.mac_address || "—"} | <strong>LDR:</strong> ${node.ldr_value ?? "—"}</div>
        </div>
        <div class="fault-card-actions">
          <button class="locate-pole-btn" data-node-id="${node.node_id}">
            <span>📍</span> ${isPlaced ? "Locate on Map" : "Show in Table"}
          </button>
        </div>
      `;

      const locateBtn = card.querySelector(".locate-pole-btn");
      if (locateBtn) {
        locateBtn.addEventListener("click", () => {
          if (isPlaced && pos && window.leafletMap) {
            window.leafletMap.setView([pos.lat, pos.lng], 18);
            const marker = this.markers[node.node_id];
            if (marker) {
              const el = marker.getElement();
              if (el) {
                this.showTooltip(node.node_id, el);
              }
            }
          } else {
            this.setFilter("fault");
            const row = document.querySelector(`tr[data-node-id="${node.node_id}"]`);
            if (row) {
              row.scrollIntoView({ behavior: "smooth", block: "center" });
              row.style.outline = "2px solid #ea4335";
              setTimeout(() => {
                row.style.outline = "";
              }, 2500);
            }
          }
        });
      }

      list.appendChild(card);
    });
  }

  saveNodeData(nodeId, data) {
    this.nodeDataStore[nodeId] = data;
  }

  isPolePlaced(nodeId) {
    return Boolean(
      this.polePositions &&
        this.polePositions[nodeId] &&
        this.polePositions[nodeId].lat !== undefined
    );
  }

  toggleEditMode() {
    this.isEditMode = !this.isEditMode;
    document.body.classList.toggle("edit-mode-active", this.isEditMode);

    if (this.editBtn) {
      const icon = this.editBtn.querySelector(".edit-btn-icon");
      const text = this.editBtn.querySelector(".edit-btn-text");

      if (this.isEditMode) {
        if (icon) icon.textContent = "💾";
        if (text) text.textContent = "Save";
        this.editBtn.classList.add("saving-mode");
        if (this.banner) this.banner.style.display = "flex";
      } else {
        if (icon) icon.textContent = "✏️";
        if (text) text.textContent = "Edit";
        this.editBtn.classList.remove("saving-mode");
        if (this.banner) this.banner.style.display = "none";

        // Save positions to localStorage when exiting edit mode
        this.savePositionsToStorage();
        this.hideTooltip();
      }
    }

    // Toggle marker draggability on OpenStreetMap
    for (const nodeId in this.markers) {
      const marker = this.markers[nodeId];
      if (this.isEditMode) {
        marker.dragging.enable();
      } else {
        marker.dragging.disable();
      }
      const el = marker.getElement();
      if (el) {
        const poleDiv = el.querySelector(".map-pole");
        if (poleDiv) {
          poleDiv.classList.toggle("draggable-pole", this.isEditMode);
        }
      }
    }

    // Refresh draggable state for table icons
    this.updateTableIconsDraggable();
    this.renderAllMapPoles();
  }

  savePositionsToStorage() {
    try {
      localStorage.setItem(
        "street_light_pole_positions",
        JSON.stringify(this.polePositions)
      );
    } catch (e) {
      console.error("Failed to save pole positions to localStorage", e);
    }
  }

  placePole(nodeId, lat, lng) {
    this.polePositions[nodeId] = { lat, lng };
    this.savePositionsToStorage();

    // Render marker on OpenStreetMap
    this.renderMapPole(nodeId);

    // Hide icon in table
    this.updateTablePoleDisplay(nodeId);
  }

  removePole(nodeId) {
    delete this.polePositions[nodeId];
    this.savePositionsToStorage();

    // Remove Leaflet marker from OpenStreetMap
    if (this.markers[nodeId] && window.leafletMap) {
      window.leafletMap.removeLayer(this.markers[nodeId]);
      delete this.markers[nodeId];
    }

    // Re-show pole icon in table
    this.updateTablePoleDisplay(nodeId);
    this.hideTooltip();
  }

  updatePolePosition(nodeId, lat, lng) {
    if (this.polePositions[nodeId]) {
      this.polePositions[nodeId] = { lat, lng };
      this.savePositionsToStorage();
    }
  }

  updateTablePoleDisplay(nodeId) {
    const row = document.querySelector(`tr[data-node-id="${nodeId}"]`);
    if (!row) return;

    const img = row.querySelector(".pole-img");
    let placeholder = row.querySelector(".pole-placed-placeholder");

    if (this.isPolePlaced(nodeId)) {
      if (img) img.style.display = "none";
      if (!placeholder) {
        placeholder = document.createElement("span");
        placeholder.className = "pole-placed-placeholder";
        placeholder.textContent = "Placed";
        const td = row.querySelector("td");
        if (td) td.appendChild(placeholder);
      }
    } else {
      if (placeholder) placeholder.remove();
      if (img) {
        img.style.display = "block";
        img.draggable = this.isEditMode;
        img.setAttribute("draggable", this.isEditMode ? "true" : "false");
        if (this.isEditMode) {
          img.classList.add("draggable-table-pole");
        } else {
          img.classList.remove("draggable-table-pole");
        }
      }
    }
  }

  updateTableIconsDraggable() {
    const rows = document.querySelectorAll("tr[data-node-id]");
    rows.forEach((row) => {
      const nodeId = row.getAttribute("data-node-id");
      if (nodeId) {
        this.updateTablePoleDisplay(nodeId);
      }
    });
  }

  getPoleIconSrc(nodeId) {
    const data = this.nodeDataStore[nodeId];
    if (!data) return "assets/street-light-fault.svg";

    const isLive = String(data.node_status).trim().toLowerCase() === "live";
    const isLedOn =
      data.led_status === true ||
      data.led_status === "true" ||
      data.led_status === "ON" ||
      (Boolean(data.led_status) &&
        data.led_status !== "false" &&
        data.led_status !== "OFF");

    if (isLive) {
      return isLedOn
        ? "assets/street-light-on.svg"
        : "assets/street-light-off.svg";
    }
    return "assets/street-light-fault.svg";
  }

  renderMapPole(nodeId) {
    if (!window.leafletMap || !this.polePositions[nodeId]) return;

    const pos = this.polePositions[nodeId];
    if (pos.lat === undefined || pos.lng === undefined) return;

    const iconSrc = this.getPoleIconSrc(nodeId);

    // If marker is already on map, update its location and state
    if (this.markers[nodeId]) {
      const marker = this.markers[nodeId];
      marker.setLatLng([pos.lat, pos.lng]);

      const el = marker.getElement();
      if (el) {
        const img = el.querySelector(".map-pole-img");
        if (img) img.src = iconSrc;
        const poleDiv = el.querySelector(".map-pole");
        if (poleDiv) {
          poleDiv.classList.toggle("draggable-pole", this.isEditMode);
        }
        if (this.isEditMode) {
          marker.dragging.enable();
        } else {
          marker.dragging.disable();
        }
      }
      return;
    }

    // Build custom Leaflet divIcon
    const poleIcon = L.divIcon({
      className: "leaflet-pole-icon-container",
      html: `
        <div class="map-pole ${this.isEditMode ? 'draggable-pole' : ''}" data-node-id="${nodeId}">
          <button class="pole-remove-btn" title="Remove pole from map">×</button>
          <div class="map-pole-icon-wrap">
            <img src="${iconSrc}" class="map-pole-img" draggable="false" alt="Pole ${nodeId}" />
          </div>
          <div class="map-pole-label">${nodeId}</div>
        </div>
      `,
      iconSize: [44, 52],
      iconAnchor: [22, 50],
    });

    const marker = L.marker([pos.lat, pos.lng], {
      icon: poleIcon,
      draggable: this.isEditMode,
      riseOnHover: true,
    });

    marker.addTo(window.leafletMap);
    this.markers[nodeId] = marker;

    // Listen to marker dragend on OpenStreetMap
    marker.on("dragend", () => {
      const newPos = marker.getLatLng();
      this.updatePolePosition(nodeId, newPos.lat, newPos.lng);
    });

    // Setup remove button and hover events once marker DOM is ready
    const setupMarkerElement = () => {
      const el = marker.getElement();
      if (!el) return;

      const removeBtn = el.querySelector(".pole-remove-btn");
      if (removeBtn) {
        removeBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          e.preventDefault();
          this.removePole(nodeId);
        });
      }

      el.addEventListener("mouseenter", () => {
        if (!this.isEditMode) {
          this.showTooltip(nodeId, el);
        }
      });

      el.addEventListener("mouseleave", () => {
        this.hideTooltip();
      });
    };

    setTimeout(setupMarkerElement, 0);
  }

  renderAllMapPoles() {
    if (!window.leafletMap) return;

    for (const nodeId in this.polePositions) {
      this.renderMapPole(nodeId);
    }
  }

  showTooltip(nodeId, poleEl) {
    if (!this.tooltip) return;
    const data = this.nodeDataStore[nodeId];
    if (!data) return;

    const isLive = String(data.node_status).trim().toLowerCase() === "live";
    const isLedOn =
      data.led_status === true ||
      data.led_status === "true" ||
      data.led_status === "ON" ||
      (Boolean(data.led_status) &&
        data.led_status !== "false" &&
        data.led_status !== "OFF");

    const statusBadgeClass = isLive ? "live" : "dead";
    const statusText = isLive ? "Live" : "Dead";
    const ledClass = isLedOn ? "led-on" : "led-off";
    const ledText = isLedOn ? "ON" : "OFF";

    this.tooltip.innerHTML = `
      <div class="pole-tooltip-header">
        <span class="pole-tooltip-title">Pole #${nodeId}</span>
        <span class="pole-tooltip-badge ${statusBadgeClass}">
          <span class="pole-tooltip-dot"></span>
          ${statusText}
        </span>
      </div>
      <div class="pole-tooltip-grid">
        <div class="pole-tooltip-row">
          <span class="pole-tooltip-lbl">LED Status:</span>
          <span class="pole-tooltip-val ${ledClass}">${ledText}</span>
        </div>
        <div class="pole-tooltip-row">
          <span class="pole-tooltip-lbl">LDR Light:</span>
          <span class="pole-tooltip-val">${data.ldr_value ?? "—"}</span>
        </div>
        <div class="pole-tooltip-row">
          <span class="pole-tooltip-lbl">MAC Addr:</span>
          <span class="pole-tooltip-val mono">${data.mac_address || "—"}</span>
        </div>
        <div class="pole-tooltip-row">
          <span class="pole-tooltip-lbl">Connected:</span>
          <span class="pole-tooltip-val">${data.formattedTime || data.connected_at || "—"}</span>
        </div>
        <div class="pole-tooltip-row">
          <span class="pole-tooltip-lbl">Last Active:</span>
          <span class="pole-tooltip-val">${data.formattedLastBeat || data.last_beat || "—"}</span>
        </div>
      </div>
    `;

    this.tooltip.style.display = "block";

    const rect = poleEl.getBoundingClientRect();
    const tooltipRect = this.tooltip.getBoundingClientRect();

    let left = rect.left + rect.width / 2;
    let top = rect.top - 12;
    let transform = "translate(-50%, -100%)";

    if (rect.top < tooltipRect.height + 24) {
      top = rect.bottom + 12;
      transform = "translate(-50%, 0)";
    }

    if (left - tooltipRect.width / 2 < 12) {
      left = tooltipRect.width / 2 + 12;
    } else if (left + tooltipRect.width / 2 > window.innerWidth - 12) {
      left = window.innerWidth - tooltipRect.width / 2 - 12;
    }

    this.tooltip.style.left = `${left}px`;
    this.tooltip.style.top = `${top}px`;
    this.tooltip.style.transform = transform;
  }

  hideTooltip() {
    if (this.tooltip) {
      this.tooltip.style.display = "none";
    }
  }
}

// Global pole manager instance
window.mapPoleManager = new MapPoleManager();

class NodeUI {
  constructor(data) {
    this.MAIN_CONT = document.getElementById("main_cont");
    this.parser(data);
  }

  node_ui() {
    // Capture per-row variables in local scope
    const currentNodeId = this.node_id;
    const currentMac = this.mac_addr;
    const currentLed = this.led_status;
    const currentLdr = this.ldr_value;
    const currentLive = this.is_live;
    const currentTime = this.time;
    const currentLastBeat = this.last_beat;
    const isLive = String(currentLive).trim().toLowerCase() === "live";

    const TR = document.createElement("TR");
    TR.setAttribute("data-node-id", currentNodeId);
    TR.setAttribute("data-status", isLive ? "active" : "fault");

    const POLE_TD = document.createElement("TD");
    const NODE_ID_TD = document.createElement("TD");
    const LED_STATUS_TD = document.createElement("TD");
    const MAC_ADDR_TD = document.createElement("TD");
    const LDR_VALUE_TD = document.createElement("TD");
    const TIMELINE_TD = document.createElement("TD");
    const IS_LIVE_TD = document.createElement("TD");
    const LAST_BEAT_TD = document.createElement("TD");

    TR.appendChild(POLE_TD);
    TR.appendChild(NODE_ID_TD);
    TR.appendChild(MAC_ADDR_TD);
    TR.appendChild(LED_STATUS_TD);
    TR.appendChild(LDR_VALUE_TD);
    TR.appendChild(TIMELINE_TD);
    TR.appendChild(IS_LIVE_TD);
    TR.appendChild(LAST_BEAT_TD);

    const POLE_IMG = document.createElement("img");
    POLE_IMG.className = "pole-img";
    POLE_IMG.dataset.nodeId = currentNodeId;

    const isLedOn =
      currentLed === true ||
      currentLed === "true" ||
      currentLed === "ON" ||
      (Boolean(currentLed) &&
        currentLed !== "false" &&
        currentLed !== "OFF");

    if (isLive) {
      POLE_IMG.src = isLedOn
        ? "assets/street-light-on.svg"
        : "assets/street-light-off.svg";
      POLE_IMG.alt = isLedOn ? "Street Light On" : "Street Light Off";
    } else {
      POLE_IMG.src = "assets/street-light-fault.svg";
      POLE_IMG.alt = "Street Light Fault";
    }
    POLE_IMG.style.width = "24px";
    POLE_IMG.style.height = "24px";
    POLE_IMG.style.display = "block";
    POLE_IMG.style.margin = "0 auto";
    POLE_TD.style.textAlign = "center";
    POLE_TD.appendChild(POLE_IMG);

    // Setup drag events for this specific row's pole icon
    POLE_IMG.addEventListener("dragstart", (e) => {
      if (!window.mapPoleManager || !window.mapPoleManager.isEditMode) {
        e.preventDefault();
        return;
      }
      const id = e.currentTarget.dataset.nodeId || currentNodeId;
      e.dataTransfer.setData("application/x-pole-id", id);
      e.dataTransfer.setData("text/plain", id);
      e.dataTransfer.effectAllowed = "move";
      POLE_IMG.classList.add("dragging");
    });

    POLE_IMG.addEventListener("dragend", () => {
      POLE_IMG.classList.remove("dragging");
    });

    // Check if this pole is already placed on map
    if (window.mapPoleManager && window.mapPoleManager.isPolePlaced(currentNodeId)) {
      POLE_IMG.style.display = "none";
      const placeholder = document.createElement("span");
      placeholder.className = "pole-placed-placeholder";
      placeholder.textContent = "Placed";
      POLE_TD.appendChild(placeholder);
    } else {
      POLE_IMG.style.display = "block";
      const canDrag = Boolean(window.mapPoleManager && window.mapPoleManager.isEditMode);
      POLE_IMG.draggable = canDrag;
      POLE_IMG.setAttribute("draggable", canDrag ? "true" : "false");
      if (canDrag) {
        POLE_IMG.classList.add("draggable-table-pole");
      } else {
        POLE_IMG.classList.remove("draggable-table-pole");
      }
    }

    NODE_ID_TD.textContent = currentNodeId;
    MAC_ADDR_TD.textContent = currentMac;
    LED_STATUS_TD.textContent = currentLed ? "ON" : "OFF";
    LDR_VALUE_TD.textContent = currentLdr;
    TIMELINE_TD.textContent = currentTime;
    IS_LIVE_TD.textContent = currentLive;
    LAST_BEAT_TD.textContent = currentLastBeat;

    LED_STATUS_TD.style.color = currentLed ? "#0b720b" : "#870202";
    TR.style.color = isLive ? "#000" : "#444";
    TR.style.backgroundColor = isLive ? "#fff" : "#888";
    this.MAIN_CONT.appendChild(TR);
  }

  parser(data) {
    this.MAIN_CONT.innerHTML = `<tr>
      <th>Pole</th>
      <th>Node id</th>
      <th>MAC</th>
      <th>LED</th>
      <th>LDR</th>
      <th>Time</th>
      <th>Status</th>
      <th>Last Active</th>
      </tr>`;

    let activeCount = 0;
    let faultCount = 0;
    let allCount = 0;

    const DATA = JSON.parse(data);
    for (const key in DATA) {
      allCount++;
      this.node_id = DATA[key].node_id;
      this.mac_addr = DATA[key].mac_address;
      this.led_status = DATA[key].led_status;
      this.ldr_value = DATA[key].ldr_value;
      this.is_live = DATA[key].node_status;
      this.last_beat = this.Time_formatting(DATA[key].last_beat);
      this.time = this.Time_formatting(DATA[key].connected_at);

      const isLive = String(this.is_live).trim().toLowerCase() === "live";
      if (isLive) {
        activeCount++;
      } else {
        faultCount++;
      }

      // Store in pole manager for live sync and hover details
      if (window.mapPoleManager) {
        window.mapPoleManager.saveNodeData(this.node_id, {
          node_id: this.node_id,
          mac_address: this.mac_addr,
          led_status: this.led_status,
          ldr_value: this.ldr_value,
          node_status: this.is_live,
          connected_at: DATA[key].connected_at,
          last_beat: DATA[key].last_beat,
          formattedTime: this.time,
          formattedLastBeat: this.last_beat,
        });
      }

      this.node_ui();
    }

    // Update counts across the sidebar and notifications
    const activeEl = document.getElementById("activePolesCount");
    const faultEl = document.getElementById("faultPolesCount");
    const tabActiveEl = document.getElementById("tabActiveCount");
    const tabFaultEl = document.getElementById("tabFaultCount");
    const allEl = document.getElementById("allCount");
    const faultBadge = document.getElementById("faultBadge");
    const sidebarFaultBadge = document.getElementById("sidebarFaultBadge");
    const notifyFaultCount = document.getElementById("notifyFaultCount");

    if (activeEl) activeEl.textContent = activeCount;
    if (tabActiveEl) tabActiveEl.textContent = activeCount;
    if (faultEl) faultEl.textContent = faultCount;
    if (tabFaultEl) tabFaultEl.textContent = faultCount;
    if (allEl) allEl.textContent = allCount;
    if (faultBadge) faultBadge.textContent = faultCount;
    if (sidebarFaultBadge) sidebarFaultBadge.textContent = faultCount;
    if (notifyFaultCount) notifyFaultCount.textContent = faultCount;

    // Apply active filter and refresh fault notification list
    if (window.mapPoleManager) {
      window.mapPoleManager.setFilter(window.mapPoleManager.currentFilter);
      window.mapPoleManager.renderFaultNotifications();

      if (window.leafletMap) {
        window.mapPoleManager.renderAllMapPoles();
      } else {
        window.addEventListener("DOMContentLoaded", () => {
          setTimeout(() => {
            if (window.mapPoleManager) {
              window.mapPoleManager.renderAllMapPoles();
            }
          }, 100);
        });
      }
    }
  }

  Time_formatting(connected_at) {
    const pastDate = new Date(connected_at.replace(" ", "T"));
    const currentDate = new Date();

    const differenceInMs = currentDate - pastDate;

    const totalSeconds = Math.floor(differenceInMs / 1000);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const totalHours = Math.floor(totalMinutes / 60);

    if (totalSeconds < 60) {
      return `${totalSeconds} sec ago`;
    } else if (totalMinutes < 60) {
      return `${totalMinutes} min ago`;
    } else if (totalHours < 24) {
      return `${totalHours} hours ago`;
    } else {
      return pastDate.toLocaleDateString();
    }
  }
}

// Initial mock load
new NodeUI(`
  {"NG_1":
    {
      "node_id":"NG_1",
      "mac_address":"ff:ff:0f:ff:ff", 
      "led_status":false, 
      "ldr_value":1000, 
      "connected_at":"2026-06-12 10:20:12",
      "last_beat":"2026-06-12 10:20:12",
      "node_status":"live"
    },
    "EN_2":
    {
      "node_id":"EN_2",
      "mac_address":"ff:ff:ff:ff:ff", 
      "led_status":false, 
      "ldr_value":1000, 
      "connected_at":"2026-06-12 10:20:12",
      "last_beat":"2026-06-12 10:20:12",
      "node_status":"dead"
    }
  }`);
