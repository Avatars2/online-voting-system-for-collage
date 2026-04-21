import React, { useState, useEffect } from 'react';
import realtimeService from '../services/realtimeService';

const RealtimeNotifications = ({ token }) => {
  const [notifications, setNotifications] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (!token) return;

    // Request notification permission
    realtimeService.requestNotificationPermission();

    // Connect to WebSocket
    realtimeService.connect(token);

    // Event listeners
    const handleConnected = () => {
      setConnectionStatus('connected');
      console.log('✅ Real-time notifications connected');
    };

    const handleDisconnected = () => {
      setConnectionStatus('disconnected');
      console.log('❌ Real-time notifications disconnected');
    };

    const handleUserRegistered = (data) => {
      const notification = {
        id: Date.now(),
        type: 'user_registered',
        title: 'New User Registered',
        message: data.message,
        data: data,
        timestamp: new Date(),
        read: false
      };
      setNotifications(prev => [notification, ...prev]);
    };

    const handleUserDeleted = (data) => {
      const notification = {
        id: Date.now(),
        type: 'user_deleted',
        title: 'User Account Deleted',
        message: data.message,
        data: data,
        timestamp: new Date(),
        read: false
      };
      setNotifications(prev => [notification, ...prev]);
    };

    const handleEmailSent = (data) => {
      const notification = {
        id: Date.now(),
        type: 'email_sent',
        title: 'Email Sent',
        message: data.message,
        data: data,
        timestamp: new Date(),
        read: false
      };
      setNotifications(prev => [notification, ...prev]);
    };

    // Register event listeners
    realtimeService.on('connected', handleConnected);
    realtimeService.on('disconnected', handleDisconnected);
    realtimeService.on('userRegistered', handleUserRegistered);
    realtimeService.on('userDeleted', handleUserDeleted);
    realtimeService.on('emailSent', handleEmailSent);

    // Cleanup
    return () => {
      realtimeService.off('connected', handleConnected);
      realtimeService.off('disconnected', handleDisconnected);
      realtimeService.off('userRegistered', handleUserRegistered);
      realtimeService.off('userDeleted', handleUserDeleted);
      realtimeService.off('emailSent', handleEmailSent);
    };
  }, [token]);

  const markAsRead = (id) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const clearNotification = (id) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const getConnectionColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      case 'disconnected': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'user_registered': return '👤';
      case 'user_deleted': return '🗑️';
      case 'email_sent': return '📧';
      default: return '📢';
    }
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      {/* Connection Status Indicator */}
      <div className="flex items-center space-x-2 mb-2">
        <div className={`w-3 h-3 rounded-full ${getConnectionColor()} animate-pulse`}></div>
        <span className="text-xs text-gray-600 capitalize">{connectionStatus}</span>
      </div>

      {/* Notification Bell */}
      <div className="relative">
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className="relative p-2 bg-white rounded-full shadow-lg hover:shadow-xl transition-shadow"
        >
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* Notifications Dropdown */}
        {showNotifications && (
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 max-h-96 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Real-time Notifications</h3>
                {notifications.length > 0 && (
                  <button
                    onClick={clearAllNotifications}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <div className="text-2xl mb-2">📭</div>
                  <p>No notifications yet</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      !notification.read ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="text-2xl">{getNotificationIcon(notification.type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {notification.title}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatTime(notification.timestamp)}
                        </p>
                      </div>
                      <div className="flex space-x-1">
                        {!notification.read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="text-xs text-blue-600 hover:text-blue-800"
                            title="Mark as read"
                          >
                            ✓
                          </button>
                        )}
                        <button
                          onClick={() => clearNotification(notification.id)}
                          className="text-xs text-red-600 hover:text-red-800"
                          title="Remove"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RealtimeNotifications;
