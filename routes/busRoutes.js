const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

// Initialize Firebase Admin
let db = null;
try {
  if (serviceAccount && serviceAccount.project_id && serviceAccount.project_id !== 'YOUR_PROJECT_ID') {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL || `https://${serviceAccount.project_id}.firebaseio.com`
    });
    db = admin.database();
    console.log('Firebase initialized successfully');
  } else {
    console.warn('Firebase credentials not set. Running in memory-only mode.');
  }
} catch (error) {
  console.error('Firebase initialization error:', error.message);
}

// POST /api/update-location - Update bus location
router.post('/update-location', async (req, res) => {
  try {
    const { busId, driverName, latitude, longitude, speed, status } = req.body;

    if (!busId || !latitude || !longitude) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const busData = {
      busId,
      driverName: driverName || 'Unknown',
      latitude,
      longitude,
      speed: speed || 0,
      status: status || 'online',
      lastUpdated: new Date().toISOString()
    };

    // Update Firebase if available
    if (db) {
      await db.ref(`buses/${busId}`).set(busData);
    }

    // Update in-memory storage
    const activeBuses = req.app.get('activeBuses');
    activeBuses.set(busId, busData);

    res.json({ success: true, data: busData });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// GET /api/bus/:id - Get specific bus information
router.get('/bus/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Try Firebase first if available
    let busData = null;
    if (db) {
      const snapshot = await db.ref(`buses/${id}`).once('value');
      busData = snapshot.val();
    }

    if (busData) {
      res.json({ success: true, data: busData });
    } else {
      // Fallback to in-memory storage
      const activeBuses = req.app.get('activeBuses');
      const memoryBusData = activeBuses.get(id);
      
      if (memoryBusData) {
        res.json({ success: true, data: memoryBusData });
      } else {
        res.status(404).json({ error: 'Bus not found' });
      }
    }
  } catch (error) {
    console.error('Error fetching bus:', error);
    res.status(500).json({ error: 'Failed to fetch bus data' });
  }
});

// GET /api/active-buses - Get all active buses
router.get('/active-buses', async (req, res) => {
  try {
    // Try Firebase first if available
    let buses = null;
    if (db) {
      const snapshot = await db.ref('buses').once('value');
      buses = snapshot.val();
    }

    if (buses) {
      const busArray = Object.values(buses).filter(bus => bus.status === 'online');
      res.json({ success: true, data: busArray });
    } else {
      // Fallback to in-memory storage
      const activeBuses = req.app.get('activeBuses');
      const busArray = Array.from(activeBuses.values()).filter(bus => bus.status === 'online');
      res.json({ success: true, data: busArray });
    }
  } catch (error) {
    console.error('Error fetching active buses:', error);
    res.status(500).json({ error: 'Failed to fetch active buses' });
  }
});

// POST /api/bus-status - Update bus status (online/offline)
router.post('/bus-status', async (req, res) => {
  try {
    const { busId, status } = req.body;

    if (!busId || !status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Update Firebase if available
    if (db) {
      await db.ref(`buses/${busId}/status`).set(status);
      await db.ref(`buses/${busId}/lastUpdated`).set(new Date().toISOString());
    }

    // Update in-memory storage
    const activeBuses = req.app.get('activeBuses');
    const busData = activeBuses.get(busId);
    if (busData) {
      busData.status = status;
      busData.lastUpdated = new Date().toISOString();
      activeBuses.set(busId, busData);
    }

    res.json({ success: true, message: `Bus status updated to ${status}` });
  } catch (error) {
    console.error('Error updating bus status:', error);
    res.status(500).json({ error: 'Failed to update bus status' });
  }
});

module.exports = router;
