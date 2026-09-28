const socket = new WebSocket(
  "wss://protocol-defining-sri-madonna.trycloudflare.com/ws",
);
const statusText = document.getElementById("status");

socket.onopen = () => {
  statusText.textContent = "Connected";
};

socket.onmessage = (event) => {
  // Print raw string data to log
  log.innerHTML += `<p>${event.data}</p>`;

  try {
    const node = new NodeUI(event.data);
  } catch (error) {
    console.error(error);
    console.log("Received non-JSON raw message payload string:", event.data);
  }
};
socket.onclose = () => {
  statusText.innerText = "Disconnected";
};
