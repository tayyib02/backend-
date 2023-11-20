const { receiveChatWithBusiness } = require("../controllers/chatController");

module.exports = (io) => {
  io.use((socket, next) => {
    const username = socket.handshake.auth.fetched_userName;
    socket.username = username;
    next();
  });
  const connectedUsers = {};
  io.on("connection", (socket) => {
    const users = [];
    let Users = [];
    for (let [id, socket] of io.of("/").sockets) {
      users.push({
        userID: id,
        username: socket.username,
        key: id,
      });
    }

    socket.on("connect_user", (userId) => {
      // Associate the user ID with the socket ID upon login
      connectedUsers[userId] = socket.id;
      // You can do further handling like marking the user as online in a database

      // Notify all clients about the updated online users list
      io.emit("userStatus", { userId, status: "online" });
    });

    socket.on("sendMessage", async (data) => {
      socket.on("sendMessage", async (data) => {
        const { senderId, receiverId, conversationId, message, media } = data;
        let mediaSid = null;

        // If media is included in the data, upload it to Twilio
        if (media) {
          const apiUrl = `https://mcs.us1.twilio.com/v1/Services/${chatServiceSid}/Media`;

          try {
            const response = await axios.post(
              apiUrl,
              {
                filename: "MediaFile", // Provide a suitable filename
                author: senderId,
                media: media,
              },
              {
                auth: {
                  username: accountSid,
                  password: authToken,
                },
                headers: {
                  "Content-Type": media.mimetype,
                },
                maxBodyLength: 25 * 1024 * 1024,
              }
            );

            mediaSid = response.data?.sid;
            console.error("Uploaded media:", response.data);
          } catch (error) {
            console.error("Error uploading media:", error.message);
            return; // Exit function or handle error as needed
          }
        }

        // Send the message to Twilio Conversations
        try {
          const messageData = {
            author: senderId,
            body: message,
          };

          if (mediaSid) {
            messageData.mediaSid = mediaSid;
          }

          const twilioMessage = await client.conversations.v1
            .conversations(conversationId)
            .messages.create(messageData);

          console.log("Twilio message SID:", twilioMessage.sid);

          // Emit message data to the sender
          socket.emit("newMessage", {
            senderId: senderId,
            receiverId: receiverId,
            message: message,
            media: mediaSid ? media : null, // Send media only if it exists
          });

          // Emit message data to the receiver if they are connected
          const receiverSocket = Array.from(io.sockets.sockets).find(
            ([id, _]) => id === receiverId
          );
          if (receiverSocket) {
            receiverSocket[1].emit("newMessage", {
              senderId: senderId,
              receiverId: receiverId,
              message: message,
              media: mediaSid ? media : null, // Send media only if it exists
            });
          }

          // Handle acknowledgment or successful message creation
        } catch (error) {
          console.error("Error sending message to Twilio:", error.message);
          // Handle error accordingly
        }
      });

      // const { sender, receiver, message } = data;

      // // Save message to the database
      // const newMessage = new Message({
      //   sender,
      //   receiver,
      //   message,
      // });
      // await newMessage.save();

      // // Notify the receiver with the message
      // const receiverSocketId = connectedUsers[receiver];
      // if (receiverSocketId) {
      //   io.to(receiverSocketId).emit("newMessage", { sender, message });
      // } else {
      //   // Handle scenario if the receiver is not online
      //   console.log(`User ${receiver} is offline. Message not delivered.`);
      //   // You can add additional handling here, such as storing the message as 'pending' for offline users
      // }
    });

    socket.on("addNewUser", (userId) => {
      let found = Users.findIndex((obj) => obj?.user_id == userId);

      console.log("found", found);
      if (found > -1) {
        Users[found].socket_id = socket.id;
      } else {
        Users.push({
          key: socket.id,
          user_id: userId,
          socket_id: socket.id,
        });
      }

      console.log("Users", Users);
    });
    socket.emit("users", users);
    // socket.emit("connect_user", users);
    console.log("users", users);

    socket.broadcast.emit("user connected", {
      userID: socket.id,
      username: socket.username,
      key: socket.id,
      self: false,
    });

    socket.on("private message", ({ content, to }) => {
      console.log("Content:", content, " To:", to);
      socket.to(to).emit("private message", {
        content,
        from: socket.id,
      });
    });

    socket.on("received-sms", () => receiveChatWithBusiness(socket));
  });

  // io.on("connection", (socket) => {
  //   console.log("new connection");

  //   socket.on("fetchMovies", () => fetchMovies(socket));

  //   socket.on("addMovie", (data) => addMovie(socket, data));

  //   socket.on("updateMovie", (data) => updateMovie(socket, data));

  //   socket.on("deleteMovie", (id) => deleteMovie(socket, id));

  //   socket.on("disconnect", () => console.log("disconnected"));
  // });
};
