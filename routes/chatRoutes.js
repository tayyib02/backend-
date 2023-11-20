const express = require("express");
const chatController = require("./../controllers/chatController");

const router = express.Router({ mergeParams: true });
const multer = require("multer");
var upload = multer();

// router.use(chatController.protect);

router.route("/sms").post(chatController.startChatWithBusiness);
router.route("/receive-sms").post(chatController.receiveChatWithBusiness);
router.route("/whatsapp").post(chatController.startWhatsAppChatWithBusiness);
router.route("/create-conversation").post(chatController.startConversation);
router.route("/create-chat").post(chatController.createOneToOneChatChannel);
router
  .route("/getAllChatsByChannelId")
  .get(chatController.getAllChatsByChannelId);
router.route("/getAllChannelsById").get(chatController.getAllChannelsById);
router
  .route("/sendMessage")
  .post(
    upload.fields([{ name: "chatFile", maxCount: 1 }]),
    chatController.sendMessagetoChaneel
  );
module.exports = router;
