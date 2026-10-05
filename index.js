class NodeUI {
  constructor(data) {
    this.MAIN_CONT = document.getElementById("main_cont");
    this.parser(data);
  }
  node_ui() {
    const TR = document.createElement("TR");

    const NODE_ID_TD = document.createElement("TD");
    const LED_STATUS_TD = document.createElement("TD");
    const MAC_ADDR_TD = document.createElement("TD");
    const LDR_VALUE_TD = document.createElement("TD");
    const TIMELINE_TD = document.createElement("TD");

    TR.appendChild(NODE_ID_TD);
    TR.appendChild(MAC_ADDR_TD);
    TR.appendChild(LED_STATUS_TD);
    TR.appendChild(LDR_VALUE_TD);
    TR.appendChild(TIMELINE_TD);

    NODE_ID_TD.textContent = this.node_id;
    MAC_ADDR_TD.textContent = this.mac_addr;
    LED_STATUS_TD.textContent = this.led_status ? "ON" : "OFF";
    LDR_VALUE_TD.textContent = this.ldr_value;
    TIMELINE_TD.textContent = this.time;

    LED_STATUS_TD.style.backgroundColor = this.led_status
      ? "#99ff99"
      : "#ff9999";
    this.MAIN_CONT.appendChild(TR);
  }

  parser(data) {
    this.MAIN_CONT.innerHTML = `<tr>
      <th>Node id</th>
      <th>MAC</th>
      <th>LED</th>
      <th>LDR</th>
      <th>Time</th>
      </tr>`;

    const DATA = JSON.parse(data);
    for (const key in DATA) {
      this.node_id = DATA[key].node_id;
      this.mac_addr = DATA[key].mac_address; // DATA["1"]["mac_address"]
      this.led_status = DATA[key].led_status;
      this.ldr_value = DATA[key].ldr_value;
      this.Time_formatting(DATA[key].connected_at);
      this.node_ui();
    }
  }

  Time_formatting(connected_at) {
    // 2. Convert both the timestamp string and current time into milliseconds
    const pastDate = new Date(connected_at.replace(" ", "T")); // Formatting string for cross-browser safety
    const currentDate = new Date();

    // 3. Subtract to find the exact difference in milliseconds
    const differenceInMs = currentDate - pastDate;

    // 4. Convert milliseconds into total seconds and minutes
    const totalSeconds = Math.floor(differenceInMs / 1000);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const totalHours = Math.floor(totalMinutes / 60);

    // 5. Generate your relative timeline string based on the duration
    if (totalSeconds < 60) {
      this.time = "Just now";
    } else if (totalMinutes < 60) {
      this.time = `${totalMinutes} min ago`;
    } else if (totalHours < 24) {
      this.time = `${totalHours} hours ago`;
    } else {
      this.time = pastDate.toLocaleDateString(); // Fallback to normal date if it's days ago
    }
  }
}

//new NodeUI(`{"1":{"node_id":"1", "mac_address":"ff:ff:ff:ff:ff", "led_status":false, "ldr_value":1000, "connected_at":"2026-06-12 10:20:12"}}`)
// new NodeUI(
//   `{"1":{"node_id":"1", "mac_address":"ff:ff:ff:ff:ff", "led_status":true, "ldr_value":1000, "connected_at":"2026-06-12 10:20:12"},"2":{"node_id":"2", "mac_address":"ff:ff:ff:ff:ff", "led_status":false, "ldr_value":1000, "connected_at":"2026-09-24 17:20:12"}}`,
// );
