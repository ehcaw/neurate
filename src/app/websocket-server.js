import { WebSocketServer } from "ws";
import http from "http";

const host = process.env.HOST || "localhost";
const port = parseInt(process.env.PORT || "1234");

// Create an HTTP server
const server = http.createServer();

// Create a WebSocket server instance
const wss = new WebSocketServer({ server });

// Store active connections
const rooms = new Map();

wss.on("connection", (ws) => {
  console.log("New client connected");

  ws.on("message", (message) => {
    // Broadcast to all clients in the same room
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message.toString());
      }
    });
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

server.listen(port, host, () => {
  console.log(`WebSocket server running at ws://${host}:${port}`);
});
