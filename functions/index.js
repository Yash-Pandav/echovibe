const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();


exports.sendNotificationOnNewMessage = functions.firestore
  .document("chats/{chatId}/messages/{messageId}")
  .onCreate(async (snap, context) => {
    
    const messageData = snap.data();
    const senderId = messageData.senderId;
    const text = messageData.text;
    const imageUrl = messageData.imageUrl;
    const chatId = context.params.chatId;

    
    const uids = chatId.split("_");
    const receiverId = uids.find((id) => id !== senderId);

    if (!receiverId) {
      console.log("Receiver ID not found.");
      return null;
    }

    try {
     
      const receiverDoc = await admin.firestore().collection("users").doc(receiverId).get();
      const receiverData = receiverDoc.data();
      const fcmToken = receiverData?.fcmToken;

      
      if (!fcmToken) {
        console.log("No FCM token found for user:", receiverId);
        return null;
      }

      
      const senderDoc = await admin.firestore().collection("users").doc(senderId).get();
      const senderName = senderDoc.data()?.name || "Someone";

      
      const notificationBody = imageUrl ? "📷 Photo" : text;

      
      const payload = {
        notification: {
          title: `New message from ${senderName}`,
          body: notificationBody,
        },
        token: fcmToken,
      };

      
      await admin.messaging().send(payload);
      console.log("Push notification sent successfully to:", receiverId);
      
      return null;
    } catch (error) {
      console.error("Error sending push notification:", error);
      return null;
    }
  });