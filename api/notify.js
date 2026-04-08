const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
    }),
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Sirf POST request allowed hai' });
  }

  try {
    const { token, title, body, url } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'FCM Token is required' });
    }

    
    const message = {
      data: {
        title: title || 'Echovibe',
        body: body || 'You have a new message!',
        click_action: url || '/chat-list'
      },
      token: token,
      
      android: {
        priority: 'high',
      },
      
      webpush: {
        headers: {
          Urgency: 'high'
        }
      }
    };

    const response = await admin.messaging().send(message);
    return res.status(200).json({ success: true, messageId: response });

  } catch (error) {
    console.error('Notification bhejne me error aayi:', error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}