const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

module.exports = (io, db) => {
    
    // GET /api/stats - Get dashboard stats
    router.get('/stats', async (req, res) => {
        try {
            if (!db) {
                return res.json({ 
                    success: true, 
                    data: { totalBuses: 0, activeBuses: 0, totalUsers: 0, totalDrivers: 0 } 
                });
            }
            const busesSnapshot = await db.collection('buses').get();
            const usersSnapshot = await db.collection('users').get();
            
            const stats = {
                totalBuses: busesSnapshot.size,
                activeBuses: busesSnapshot.docs.filter(d => d.data().status === 'online').length,
                totalUsers: usersSnapshot.size,
                totalDrivers: usersSnapshot.docs.filter(d => d.data().role === 'driver').length
            };
            
            res.json({ success: true, data: stats });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });

    // POST /api/sos - Explicit SOS endpoint (for redundancy)
    router.post('/sos', async (req, res) => {
        const { busId, busNumber, lat, lng } = req.body;
        
        try {
            const sosEvent = {
                busId,
                busNumber,
                lat,
                lng,
                timestamp: new Date().toISOString(),
                status: 'pending'
            };
            
            if (db) {
                await db.collection('emergency').add(sosEvent);
            }
            
            // Emit to all connected admins via socket
            io.emit('emergency-alert', sosEvent);
            
            res.json({ success: true, message: 'SOS Alert Sent' });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });

    // POST /api/attendance - Log student attendance
    router.post('/attendance', [
        body('studentId').notEmpty(),
        body('busId').notEmpty()
    ], async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const { studentId, busId, type } = req.body;
        
        try {
            const record = {
                studentId,
                busId,
                type: type || 'boarding',
                timestamp: new Date().toISOString()
            };
            
            if (db) {
                await db.collection('attendance').add(record);
            }
            
            // Here you would trigger FCM for parent notification
            // await admin.messaging().send(...)
            
            res.json({ success: true, data: record });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });

    return router;
};
