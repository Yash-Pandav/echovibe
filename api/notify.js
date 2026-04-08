const admin = require('firebase-admin');

// 1. Firebase Admin ko start karna (Master Key ke sath)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Vercel ke liye \n ko actual new lines me convert karna zaroori hai
      privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
    }),
  });
}

// 2. API Endpoint jo Angular se signal catch karega
export default async function handler(req, res) {
  // CORS policies (Taaki Angular is API ko call kar sake)
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

    // 3. Notification ka Data banana
    const message = {
      data: {
        title: title || 'Echovibe',
        body: body || 'You have a new message!',
        click_action: url || '/chat-list'
      },
      token: token // Jisko bhejna hai uska address (token)
    };

    // 4. Google FCM ko bolna notification bhej de!
    const response = await admin.messaging().send(message);
    return res.status(200).json({ success: true, messageId: response });

  } catch (error) {
    console.error('Notification bhejne me error aayi:', error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}