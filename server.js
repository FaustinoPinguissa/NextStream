const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const connectDB = require("./Server/database/connection");
const socketIO = require("socket.io");

dotenv.config({ path: "config.env" });

const app = express();
const PORT = process.env.PORT || 4014;

// MongoDB Connection
connectDB();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.set("view engine", "ejs");

// Static Files
app.use("/css", express.static(path.resolve(__dirname, "Assets/css")));
app.use("/img", express.static(path.resolve(__dirname, "Assets/img")));
app.use("/js", express.static(path.resolve(__dirname, "Assets/js")));

// Routes
app.use("/", require("./Server/routes/router"));

// Server Listening
const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// Socket.io Setup
const io = socketIO(server, {
  allowEIO3: true, // False by default
});

// User Connections
let userConnections = [];

io.on("connection", (socket) => {
  console.log("Socket id is: ", socket.id);

  socket.on("userconnect", (data) => {
    console.log("Logged in username", data.displayName);
    userConnections.push({
      connectionId: socket.id,
      user_id: data.displayName,
    });

    const userCount = userConnections.length;
    console.log("UserCount", userCount);
  });

  socket.on("offerSentToRemote", (data) => {
    const offerReceiver = userConnections.find((o) => o.user_id === data.remoteUser);
    if (offerReceiver) {
      console.log("OfferReceiver user is: ", offerReceiver.connectionId);
      socket.to(offerReceiver.connectionId).emit("ReceiveOffer", data);
    }
  });

  socket.on("answerSentToUser1", (data) => {
    const answerReceiver = userConnections.find((o) => o.user_id === data.receiver);
    if (answerReceiver) {
      console.log("answerReceiver user is: ", answerReceiver.connectionId);
      socket.to(answerReceiver.connectionId).emit("ReceiveAnswer", data);
    }
  });

  socket.on("candidateSentToUser", (data) => {
    const candidateReceiver = userConnections.find((o) => o.user_id === data.remoteUser);
    if (candidateReceiver) {
      console.log("candidateReceiver user is: ", candidateReceiver.connectionId);
      socket.to(candidateReceiver.connectionId).emit("candidateReceiver", data);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
    const disUser = userConnections.find((p) => p.connectionId === socket.id);
    if (disUser) {
      userConnections = userConnections.filter((p) => p.connectionId !== socket.id);
      console.log(
        "Remaining users: ",
        userConnections.map((user) => user.user_id)
      );
    }
  });
});
