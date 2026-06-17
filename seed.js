const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase Admin
let serviceAccount;
try {
    serviceAccount = require('./firebase-service-account.json');
} catch (e) {
    console.error("Missing firebase-service-account.json. Seed cancelled.");
    process.exit(1);
}

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

const seed = async () => {
    console.log('🌱 Starting Seed Process...');

    // 1. Create Samples Routes
    const routes = [
        {
            id: 'RT-BLUE',
            routeNumber: 'A',
            routeName: 'Campus Loop (Blue)',
            stops: [
                { name: 'Main Gate', lat: 28.4755, lng: 77.4900, order: 1 },
                { name: 'Engineering Admin', lat: 28.4744, lng: 77.4827, order: 2 },
                { name: 'Central Cafeteria', lat: 28.4725, lng: 77.4840, order: 3 },
                { name: 'Sports Complex', lat: 28.4710, lng: 77.4810, order: 4 },
                { name: 'Hostel Block 1', lat: 28.4700, lng: 77.4870, order: 5 }
            ],
            duration: '15 min'
        },
        {
            id: 'RT-RED',
            routeNumber: 'B',
            routeName: 'Hostel Express (Red)',
            stops: [
                { name: 'Sports Complex', lat: 28.4710, lng: 77.4810, order: 1 },
                { name: 'University Library', lat: 28.4735, lng: 77.4855, order: 2 },
                { name: 'Engineering Building', lat: 28.4745, lng: 77.4820, order: 3 },
                { name: 'Main Gate', lat: 28.4755, lng: 77.4900, order: 4 }
            ],
            duration: '12 min'
        }
    ];

    console.log('Writing routes...');
    for (const r of routes) {
        await db.collection('routes').doc(r.id).set(r);
    }

    // 2. Create Sample Drivers
    const drivers = [
        { id: 'DRV-001', name: 'Ravi Kumar', phone: '+91 98765 43210', assignedBus: 'BUS-12', assignedRoute: 'RT-RED', status: 'active' },
        { id: 'DRV-002', name: 'John Doe', phone: '+91 99999 88888', assignedBus: 'BUS-29', assignedRoute: 'RT-BLUE', status: 'active' }
    ];

    console.log('Writing drivers...');
    for (const d of drivers) {
        await db.collection('drivers').doc(d.id).set(d);
    }

    // 3. Create Sample Buses
    const buses = [
        { id: 'BUS-12', busNumber: '12', driverName: 'Ravi Kumar', driverPhone: '+91 98765 43210', routeId: 'RT-RED', status: 'online', speed: 32, latitude: 28.4710, longitude: 77.4810, occupancy: '68%', driverId: 'DRV-001' },
        { id: 'BUS-29', busNumber: '29', driverName: 'John Doe', driverPhone: '+91 99999 88888', routeId: 'RT-BLUE', status: 'online', speed: 45, latitude: 28.4755, longitude: 77.4900, occupancy: '30%', driverId: 'DRV-002' },
        { id: 'BUS-07', busNumber: '07', driverName: 'Sam Smith', driverPhone: '+91 11111 22222', routeId: 'RT-BLUE', status: 'online', speed: 28, latitude: 28.4744, longitude: 77.4827, occupancy: '10%' }
    ];

    console.log('Writing buses...');
    for (const b of buses) {
        await db.collection('buses').doc(b.busNumber).set(b);
        await db.collection('liveLocations').doc(b.busNumber).set({
            busId: b.busNumber,
            latitude: b.latitude,
            longitude: b.longitude,
            speed: b.speed,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
    }

    // 4. Create Sample Alerts
    const alerts = [
        { message: 'Road construction near Main Gate. Slight delays expected.', type: 'info', timestamp: new Date().toISOString() },
        { message: 'Emergency: Route B temporarily suspended.', type: 'emergency', timestamp: new Date().toISOString() },
        { message: 'Campus Loop (Blue) now running on 10-minute intervals.', type: 'info', timestamp: new Date().toISOString() }
    ];

    console.log('Writing alerts...');
    for (const a of alerts) {
        await db.collection('alerts').add(a);
    }

    console.log('✅ Seed Data Created Successfully!');
    process.exit(0);
};

seed();
