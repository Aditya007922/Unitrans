const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const admin = require('firebase-admin');
require('dotenv').config();

// Firebase Admin Initialization
const serviceAccount = require('./firebase-service-account.json');

let db = null;
if (!admin.apps.length) {
  try {
    if (serviceAccount && serviceAccount.private_key && serviceAccount.private_key !== 'YOUR_PRIVATE_KEY') {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL
      });
      db = admin.firestore();
      console.log('Firebase Admin initialized with Firestore');
    } else {
      console.warn('Firebase credentials not set or invalid. Running in restricted mode.');
    }
  } catch (err) {
    console.error('Firebase Admin init error:', err.message);
  }
} else {
  db = admin.firestore();
}

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Socket.IO Handler
const socketHandler = require('./socket/socketHandler');
socketHandler(io);

// Pass IO and Firestore to routes
const routes = require('./routes/api');
app.use('/api', routes(io, db));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
