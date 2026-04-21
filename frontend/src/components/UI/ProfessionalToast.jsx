import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', options = {}) => {
    const {
      duration = type === 'error' ? 8000 : 5000,
      action = null,
      persistent = false
    } = options;
    
    const id = Date.now() + Math.random();
    const toast = { 
      id, 
      message, 
      type, 
      duration: persistent ? 0 : duration,
      action,
      timestamp: new Date()
    };
    
    setToasts(prev => [...prev, toast]);
    
    if (!persistent && duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const value = {
    toasts,
    addToast,
    removeToast,
    clearToasts,
    // Professional toast methods
    success: (message, options) => addToast(message, 'success', options),
    error: (message, options) => addToast(message, 'error', options),
    warning: (message, options) => addToast(message, 'warning', options),
    info: (message, options) => addToast(message, 'info', options),
    // Specific professional messages
    networkError: () => addToast('Network error. Please check your connection.', 'error'),
    serverError: () => addToast('Server error. Please try again later.', 'error'),
    validationError: (field) => addToast(`Please check the ${field} field.`, 'warning'),
    unauthorized: () => addToast('Please log in to continue.', 'warning'),
    sessionExpired: () => addToast('Your session has expired. Please log in again.', 'warning')
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
};

const ToastContainer = () => {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 pointer-events-none">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

const ToastItem = ({ toast, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  React.useEffect(() => {
    setIsVisible(true);
    return () => setIsVisible(false);
  }, []);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => onClose(), 200);
  };

  const getProfessionalStyles = () => {
    const baseStyles = "transform transition-all duration-300 ease-out pointer-events-auto";
    const animationStyles = isVisible && !isLeaving 
      ? "translate-x-0 opacity-100 scale-100" 
      : "translate-x-full opacity-0 scale-95";
    
    return `${baseStyles} ${animationStyles}`;
  };

  const getToastStyles = () => {
    const styles = {
      success: "bg-white border-l-4 border-green-500 text-gray-800 shadow-lg",
      error: "bg-white border-l-4 border-red-500 text-gray-800 shadow-lg",
      warning: "bg-white border-l-4 border-yellow-500 text-gray-800 shadow-lg",
      info: "bg-white border-l-4 border-blue-500 text-gray-800 shadow-lg"
    };
    return styles[toast.type];
  };

  const getIcon = () => {
    const icons = {
      success: <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>,
      error: <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>,
      warning: <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>,
      info: <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    };
    return icons[toast.type];
  };

  return (
    <div className={getProfessionalStyles()}>
      <div className={`min-w-[320px] max-w-md p-4 rounded-lg ${getToastStyles()}`}>
        <div className="flex items-start space-x-3">
          {/* Professional Icon */}
          <div className="flex-shrink-0 mt-0.5">
            {getIcon()}
          </div>
          
          {/* Message Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-relaxed">
              {toast.message}
            </p>
            
            {/* Optional Action Button */}
            {toast.action && (
              <button
                onClick={toast.action.handler}
                className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                {toast.action.label}
              </button>
            )}
          </div>
          
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors rounded-md hover:bg-gray-100"
            aria-label="Close notification"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
