const Business = require("../models/businessModel");
const ChatUser = require("../models/chatModal");
const User = require("../models/userModel");
const factory = require("./handlerFactory");
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const MessagingResponse = require("twilio").twiml.MessagingResponse;
const client = require("twilio")(accountSid, authToken);
const path = require("path");
// const pic = require("./pic.jpg");

exports.startChatWithBusiness = async (req, res) => {
  try {
    // client.region = "pak";
    client.messages
      .create({
        body: `${req.body.message}`,
        from: `${req.body.from}`, // sender
        to: "+447383102383", // receiver
      })
      .then((message) => {
        return res.json({ msg: "message successfully sent!" });
      })
      .catch((error) => {
        // You can implement your fallback code here
        console.log(error);
        return res.status(400).json({ msg: "message sent failed!" });
      });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ msg: error.message });
  }
};

exports.receiveChatWithBusiness = async (req, res, socket) => {
  try {
    console.log("web hook hittt", req.body?.Body);

    socket.emit("received-sms", req.body?.Body);

    // return res.json({ receivedWebHook: req.body?.Body });

    //commented code below for auto generated msg if you want to send automatically
    // const twiml = new MessagingResponse();
    // twiml.message("messages receiving!");
    // res.writeHead(200, { "Content-Type": "text/xml" });
    // res.end(twiml.toString());
  } catch (error) {
    console.log(error);
    return res.json({ msg: error.message });
  }
};

exports.startWhatsAppChatWithBusiness = async (req, res) => {
  try {
    // client.region = "pak";
    client.messages
      .create({
        body: `${req.body.message}`,
        from: `whatsapp:${req.body.from}`, // sender
        to: "whatsapp:447383102383",
      })
      .then((message) => {
        return res.json({ msg: "message successfully sent on whatsApp!" });
      })
      .catch((error) => {
        // You can implement your fallback code here
        console.log(error);
        return res.json({ msg: "message sent failed!" });
      });
  } catch (error) {
    console.log(error);
    return res.json({ msg: error.message });
  }
};

exports.startConversation = async (req, res) => {
  try {
    // Create a conversation using Twilio Conversations API
    const conversation = await client.conversations.conversations.create({
      friendlyName: "My Conversation", // You can customize this name
    });

    res.json({ conversation });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create conversation" });
  }
};
exports.createOneToOneChatChannel = async (req, res) => {
  const channelUniqueName = `${req.body.businessId}-${req.body.userId}`;
  if (!req.body.businessId) {
    return res.status(400).json({ message: "Business id is required" });
  }
  if (!req.body.userId) {
    return res.status(400).json({ message: "User id is required" });
  }
  // Check if the channel already exists
  let channel;
  try {
    const channel = await ChatUser.findOne({
      business_id: req.body.businessId,
      user_id: req.body.userId,
    });
    return res.status(200).json({
      message: "Channel is already exists",
      channelId: `${channel.sid}`,
    });
  } catch (error) {
    // Channel doesn't exist, create a new one
    let memberIdentities = [req.body.businessId, req.body.userId];
    try {
      channel = await client.conversations.v1.conversations.create({
        friendlyName: channelUniqueName,
        uniqueName: channelUniqueName,
        users: memberIdentities.map((identity) => ({ identity })),
      });
      const chat = await ChatUser.findOne({
        channel_id: channel.sid,
      });
      if (!chat) {
        const user = await User.findOne({ _id: req.body.userId }).select(
          "FirstName LastName"
        );
        const business = await Business.findOne({
          _id: req.body.businessId,
        }).select("title");
        await ChatUser.create({
          user_id: req.body.userId,
          business_id: req.body.businessId,
          user_name: `${user?.FirstName} ${user?.LastName}`,
          business_name: business.title,
          channel_id: channel.sid,
        });
        res.status(200).json({ channel: channel });
      }
    } catch (err) {
      console.log(err);
      res.status(500).json({ message: "Something went wrong" });
    }
  }
};
// exports.sendMessagetoChaneel = async (req, res) => {
//   if (!req.body.channelId) {
//     return res.status(400).json({ message: "Channel id is required" });
//   }
//   if (!req.body.senderId) {
//     return res.status(400).json({ message: "sender id is required" });
//   }
//   if (!req.body.message) {
//     return res.status(400).json({ message: "Message is requird" });
//   }

//   // Check if the channel already exists
//   try {
//     const channels = await client.chat
//       .services(process.env.TWILIO_CHAT_SERVICE_SID)
//       .channels(req.body.channelId);
//     const message = await channels.messages.create({
//       body: req.body.message,
//       from: req.body.senderId,
//     });
//     // const messages=await channels.messages.list()
//     res.status(200).json({ messages: message });
//   } catch (error) {
//     console.error(error);
//     // Channel doesn't exist, create a new one
//     res.status(500).json({ error: error });
//   }
// };
exports.sendMessagetoChaneel = async (req, res) => {
  try {
    if (!req.body.conversationId) {
      return res.status(400).json({ message: "Conversation id is required" });
    }
    if (!req.body.senderId) {
      return res.status(400).json({ message: "Sender id is required" });
    }
    if (!req.body.message && !req.files["chatFile"]) {
      return res.status(400).json({ message: "Content is required" });
    }
    const axios = require("axios");
    const fs = require("fs");

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const chatServiceSid = process.env.TWILIO_CHAT_SERVICE_SID;

    const client = require("twilio")(accountSid, authToken);
    let medisSid = null;
    if (req?.files["chatFile"]) {
      const apiUrl = `https://mcs.us1.twilio.com/v1/Services/${chatServiceSid}/Media`;
      await axios({
        method: "post",
        url: apiUrl,
        auth: {
          username: accountSid,
          password: authToken,
        },
        data: {
          filename: req.files["chatFile"][0]?.originalname,
          author: req?.body?.userId,
          media: req.files["chatFile"][0],
        },
        headers: {
          "Content-Type": req.files["chatFile"][0]?.mimetype,
        },
        maxBodyLength: 25 * 1024 * 1024,
      })
        .then((response) => {
          medisSid = response.data?.sid;
          console.error("Er:", response.data);
          // res.status(200).json({ message: response.data });
        })
        .catch((error) => {
          console.error("Error:", error.message);
          res.status(500).json({ message: error.message });
        });
    }
    if (req?.files["chatFile"] &&medisSid) {
      await client.conversations.v1
      .conversations(req?.body?.conversationId)
      .messages.create({
        author: req?.body?.senderId,
        body: "Media Message",
        mediaSid: medisSid,
      })
      .then((message) => {
        console.log(message.sid);

        res.status(200).json({ message: message });
      });
    } else{
      await client.conversations.v1
      .conversations(req?.body?.conversationId)
      .messages.create({
        author: req?.body?.senderId,
        body: req?.body?.message 
       
      })
      .then((message) => {
        console.log(message.sid);

        res.status(200).json({ message: message });
      });
    }
  
  } catch (error) {
    console.error(error);
    // Channel doesn't exist, create a new one
    res.status(500).json({ error: error });
  }
};
exports.getAllChatsByChannelId = async (req, res) => {
  if (!req.query.channelId) {
    return res.status(400).json({ message: "Channel id is required" });
  }
  try {
    const channel = await client.conversations.v1
      .conversations(req.query.channelId)
      .messages.list();

    return res.status(200).json({ messages: channel });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Some" });
  }
};

exports.getAllChannelsById = async (req, res) => {
  if (!req.query.id) {
    return res.status(400).json({ message: "User id is required" });
  }
  if (!req.query.type) {
    return res.status(400).json({ message: "Type is required" });
  }
  try {
    let id = req?.query?.id;
    let type = req?.query?.type;
    let query = {};
    if (type === "User") {
      query = {
        user_id: id,
      };
    } else {
      query = {
        business_id: id,
      };
    }

    if (!query?.user_id && !query?.business_id) {
      return res.status(400).json({ message: "No Channel Found" });
    }

    const chats = await ChatUser.find(query);

    return res.status(200).json({ chats: chats });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Some" });
  }
};
