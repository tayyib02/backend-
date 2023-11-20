const mongoose = require("mongoose");
const dotenv = require("dotenv");

process.on("uncaughtException", (err) => {
  console.log("Uncaught exception! 🥲 shutting down...");
  console.log(err.name, err.message);
  process.exit(1);
});

dotenv.config({ path: "./.env" });
const app = require("./index");
const http = require("http");
const server = http.createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: "http://127.0.0.1:5173", // Replace with your React app's origin
    methods: ["GET", "POST"],
    credentials: true,
  },
});
require("./socket")(io);

const DB = process.env.DATABASE.replace(
  "<PASSWORD>",
  process.env.DATABASE_PASSWORD
);

mongoose.connect(DB).then(() => console.log("DB connection successfull!"));

const port = process.env.PORT || 3000;

// Store connected users
// const connectedUsers = {};

// io.on("connection", (socket) => {
//   console.log("A user connected");

//   // Handle user login and store the socket for the user
//   socket.on("login", (userId) => {
//     console.log("userId", userId);
//     connectedUsers[userId] = socket;
//   });

//   // Handle private messages
//   socket.on("private message", ({ recipientId, message }) => {
//     console.log("receiveddd");
//     console.log("received", message);
//     const recipientSocket = connectedUsers[recipientId];
//     if (recipientSocket) {
//       recipientSocket.emit("private message", message);
//     } else {
//       console.log("else");
//       // Handle the case where the recipient is not online or does not exist
//       socket.emit("error", "Recipient is not online or does not exist");
//     }
//   });

//   // socket.on("disconnect", () => {
//   //   // Remove disconnected user from the list of connected users
//   //   for (const userId in connectedUsers) {
//   //     if (connectedUsers[userId] === socket) {
//   //       delete connectedUsers[userId];
//   //       break;
//   //     }
//   //   }
//   //   console.log("A user disconnected");
//   // });
// });

// Initialize WebSocket connection
// io.on("connection", (socket) => {
//   socket.on("join", (conversationSid, user) => {
//     // Join a conversation
//     socket.join(conversationSid);
//     socket.user = user; // Assign a user identifier to the socket
//   });

//   socket.on("message", async (data) => {
//     // Send a message to a specific user in the conversation
//     const { conversationSid, body, to } = data;

//     try {
//       const accountSid = process.env.TWILIO_ACCOUNT_SID;
//       const authToken = process.env.TWILIO_AUTH_TOKEN;

//       const client = require("twilio")(accountSid, authToken);
//       const message = await client.conversations
//         .conversations(conversationSid)
//         .messages.create({
//           body,
//           from: "+447723343740",
//         });

//       // Find the recipient's socket by user identifier and emit the message
//       const recipientSocket = [
//         ...io.sockets.in(conversationSid).sockets.values(),
//       ].find((recipient) => recipient.user === to);

//       if (recipientSocket) {
//         recipientSocket.emit("message", message);
//       } else {
//         console.log(`User ${to} not found in the conversation.`);
//       }
//     } catch (error) {
//       console.error(error);
//     }
//   });
// });

server.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

process.on("unhandledRejection", (err) => {
  console.log("Unhandled rejection! shutting down...");
  console.log(err.name, err.message);

  server.close(() => {
    process.exit(1);
  });
});
