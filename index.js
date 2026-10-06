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
    const IS_LIVE_TD = document.createElement("TD");
    const LAST_BEAT_TD = document.createElement("TD");


    TR.appendChild(NODE_ID_TD);
    TR.appendChild(MAC_ADDR_TD);
    TR.appendChild(LED_STATUS_TD);
    TR.appendChild(LDR_VALUE_TD);
    TR.appendChild(TIMELINE_TD);
    TR.appendChild(IS_LIVE_TD);
    TR.appendChild(LAST_BEAT_TD);


    NODE_ID_TD.textContent = this.node_id;
    MAC_ADDR_TD.textContent = this.mac_addr;
    LED_STATUS_TD.textContent = this.led_status ? "ON" : "OFF";
    LDR_VALUE_TD.textContent = this.ldr_value;
    TIMELINE_TD.textContent = this.time;
    IS_LIVE_TD.textContent = this.is_live;
    LAST_BEAT_TD.textContent = this.last_beat;


    LED_STATUS_TD.style.color = this.led_status
      ? "#0b720b"
      : "#870202";
    TR.style.color = this.is_live == "live"
      ? "#000"
      : "#444";
    TR.style.backgroundColor = this.is_live == "live"
      ? "#fff"
      : "#888";
    this.MAIN_CONT.appendChild(TR);
  }

  parser(data) {
    this.MAIN_CONT.innerHTML = `<tr>
      <th>Node id</th>
      <th>MAC</th>
      <th>LED</th>
      <th>LDR</th>
      <th>Time</th>
      <th>Status</th>
      <th>Last Active</th>
      </tr>`;

    const DATA = JSON.parse(data);
    for (const key in DATA) {
      this.node_id = DATA[key].node_id;
      this.mac_addr = DATA[key].mac_address; // DATA["1"]["mac_address"]
      this.led_status = DATA[key].led_status;
      this.ldr_value = DATA[key].ldr_value;
      this.is_live = DATA[key].node_status;
      this.last_beat = this.Time_formatting(DATA[key].last_beat);
      this.time = this.Time_formatting(DATA[key].connected_at);
      this.node_ui();
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

new NodeUI(`
  {"1":
    {
      "node_id":"1",
      "mac_address":"ff:ff:ff:ff:ff", 
      "led_status":false, 
      "ldr_value":1000, 
      "connected_at":"2026-06-12 10:20:12",
      "last_beat":"2026-06-12 10:20:12",
      "node_status":"live"
    },
    "2":
    {
      "node_id":"2",
      "mac_address":"ff:ff:ff:ff:ff", 
      "led_status":false, 
      "ldr_value":1000, 
      "connected_at":"2026-06-12 10:20:12",
      "last_beat":"2026-06-12 10:20:12",
      "node_status":"dead"
    }
  }`)
// new NodeUI(
//   `{"1":{"node_id":"1", "mac_address":"ff:ff:ff:ff:ff", "led_status":true, "ldr_value":1000, "connected_at":"2026-06-12 10:20:12"},"2":{"node_id":"2", "mac_address":"ff:ff:ff:ff:ff", "led_status":false, "ldr_value":1000, "connected_at":"2026-09-24 17:20:12"}}`,
// );
