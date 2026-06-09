const admin = require('firebase-admin');

// Socket.IO connection handler
module.exports = (io) => {
  // Store connected clients
  const connectedClients = new Map();

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Handle driver connection
    socket.on('driver-connect', (data) => {
      const { busId, driverName } = data;
      connectedClients.set(socket.id, { type: 'driver', busId, driverName });
      socket.join(`bus-${busId}`);
      console.log(`Driver connected for bus ${busId}`);
      
      // Notify all passengers that driver is online
      io.to(`bus-${busId}`).emit('driver-online', { busId, driverName });
    });

    // Handle passenger connection
    socket.on('passenger-connect', (data) => {
      const { busId } = data;
      connectedClients.set(socket.id, { type: 'passenger', busId });
      socket.join(`bus-${busId}`);
      console.log(`Passenger connected to bus ${busId}`);
    });

    // Handle location updates from driver
    socket.on('location-update', (data) => {
      const { busId, latitude, longitude, speed, driverName } = data;
      
      // Broadcast location to all passengers watching this bus
      io.to(`bus-${busId}`).emit('location-update', {
        busId,
        latitude,
        longitude,
        speed,
        driverName,
        timestamp: new Date().toISOString()
      });

      console.log(`Location update for bus ${busId}: ${latitude}, ${longitude}`);
    });

    // Handle bus status changes
    socket.on('status-update', (data) => {
      const { busId, status } = data;
      
      // Broadcast status to all passengers watching this bus
      io.to(`bus-${busId}`).emit('status-update', {
        busId,
        status,
        timestamp: new Date().toISOString()
      });

      console.log(`Status update for bus ${busId}: ${status}`);
    });

    // Handle passenger requesting current location
    socket.on('request-location', (data) => {
      const { busId } = data;
      
      // Request driver to send current location
      io.to(`bus-${busId}`).emit('location-request', { busId });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      const client = connectedClients.get(socket.id);
      if (client) {
        if (client.type === 'driver') {
          // Notify passengers that driver went offline
          io.to(`bus-${client.busId}`).emit('driver-offline', { 
            busId: client.busId,
            timestamp: new Date().toISOString()
          });
          console.log(`Driver disconnected from bus ${client.busId}`);
        }
        connectedClients.delete(socket.id);
      }
      console.log('Client disconnected:', socket.id);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  // Make connected clients accessible
  io.connectedClients = connectedClients;
};
