import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';

class WebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // userId -> WebSocket connection
    this.adminClients = new Set(); // Admin connections
  }

  initialize(server) {
    this.wss = new WebSocketServer({ server });
    
    this.wss.on('connection', (ws, req) => {
      console.log('🔌 New WebSocket connection established');
      
      // Handle authentication
      const token = this.extractToken(req);
      if (!token) {
        console.log('❌ No token provided, closing connection');
        ws.close(1008, 'Authentication required');
        return;
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = {
          id: decoded.id || decoded.userId,
          role: decoded.role,
          name: decoded.name
        };

        // Store client connection
        this.clients.set(user.id, {
          ws,
          user,
          connectedAt: new Date()
        });

        // Add admin clients
        if (user.role === 'admin') {
          this.adminClients.add(ws);
        }

        console.log(`✅ User ${user.name} (${user.role}) connected via WebSocket`);
        
        // Send welcome message
        this.sendToClient(user.id, {
          type: 'CONNECTION_ESTABLISHED',
          data: {
            message: 'Real-time notifications enabled',
            timestamp: new Date().toISOString()
          }
        });

        // Handle messages
        ws.on('message', (message) => {
          this.handleMessage(user.id, message);
        });

        // Handle disconnection
        ws.on('close', () => {
          this.handleDisconnection(user.id, user);
        });

        // Handle errors
        ws.on('error', (error) => {
          console.error(`❌ WebSocket error for user ${user.id}:`, error);
        });

      } catch (error) {
        console.log('❌ Invalid token, closing connection');
        ws.close(1008, 'Invalid authentication token');
      }
    });

    console.log('🌐 WebSocket server initialized');
  }

  extractToken(req) {
    const url = new URL(req.url, 'http://localhost:5001');
    return url.searchParams.get('token');
  }

  handleMessage(userId, message) {
    try {
      const data = JSON.parse(message);
      console.log(`📨 Message from user ${userId}:`, data);
      
      // Handle different message types
      switch (data.type) {
        case 'PING':
          this.sendToClient(userId, {
            type: 'PONG',
            data: { timestamp: new Date().toISOString() }
          });
          break;
        default:
          console.log(`Unknown message type: ${data.type}`);
      }
    } catch (error) {
      console.error(`❌ Error handling message from user ${userId}:`, error);
    }
  }

  handleDisconnection(userId, user) {
    this.clients.delete(userId);
    this.adminClients.delete(user.ws);
    console.log(`🔌 User ${user.name} (${user.role}) disconnected`);
  }

  sendToClient(userId, message) {
    const client = this.clients.get(userId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error(`❌ Error sending message to user ${userId}:`, error);
        return false;
      }
    }
    return false;
  }

  // Send to all admin clients
  sendToAdmins(message) {
    let sentCount = 0;
    this.adminClients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify(message));
          sentCount++;
        } catch (error) {
          console.error('❌ Error sending to admin client:', error);
        }
      }
    });
    return sentCount;
  }

  // Send to all clients
  broadcast(message) {
    let sentCount = 0;
    this.clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(JSON.stringify(message));
          sentCount++;
        } catch (error) {
          console.error(`❌ Error broadcasting to client ${client.user.id}:`, error);
        }
      }
    });
    return sentCount;
  }

  // User registration notification
  notifyUserRegistration(userData) {
    const message = {
      type: 'USER_REGISTERED',
      data: {
        user: {
          name: userData.name,
          email: userData.email,
          role: userData.role,
          registeredAt: new Date().toISOString()
        },
        message: `New ${userData.role} registered: ${userData.name}`,
        timestamp: new Date().toISOString()
      }
    };

    // Send to all admins
    const adminCount = this.sendToAdmins(message);
    
    // Send to all connected users (general notification)
    const broadcastCount = this.broadcast({
      ...message,
      data: {
        ...message.data,
        message: `New ${userData.role} joined the system`,
        private: false
      }
    });

    console.log(`📧 Registration notification sent to ${adminCount} admins and ${broadcastCount} clients`);
    
    return { adminCount, broadcastCount };
  }

  // User deletion notification
  notifyUserDeletion(userData) {
    const message = {
      type: 'USER_DELETED',
      data: {
        user: {
          name: userData.name,
          email: userData.email,
          role: userData.role,
          deletedAt: new Date().toISOString()
        },
        deletedBy: userData.deletedBy,
        message: `${userData.role} account deleted: ${userData.name}`,
        timestamp: new Date().toISOString()
      }
    };

    // Send to all admins
    const adminCount = this.sendToAdmins(message);
    
    // Send to all connected users (general notification)
    const broadcastCount = this.broadcast({
      ...message,
      data: {
        ...message.data,
        message: `${userData.role} account removed from system`,
        private: false
      }
    });

    console.log(`🗑️ Deletion notification sent to ${adminCount} admins and ${broadcastCount} clients`);
    
    return { adminCount, broadcastCount };
  }

  // Email sent notification
  notifyEmailSent(emailData) {
    const message = {
      type: 'EMAIL_SENT',
      data: {
        email: {
          to: emailData.to,
          type: emailData.type,
          sentAt: new Date().toISOString()
        },
        message: `${emailData.type} email sent to ${emailData.to}`,
        timestamp: new Date().toISOString()
      }
    };

    // Send to all admins
    const adminCount = this.sendToAdmins(message);
    
    console.log(`📧 Email notification sent to ${adminCount} admins`);
    
    return { adminCount };
  }

  // Get connection stats
  getStats() {
    return {
      totalConnections: this.clients.size,
      adminConnections: this.adminClients.size,
      clients: Array.from(this.clients.values()).map(client => ({
        userId: client.user.id,
        role: client.user.role,
        name: client.user.name,
        connectedAt: client.connectedAt
      }))
    };
  }
}

// Create singleton instance
const websocketService = new WebSocketService();

export default websocketService;
