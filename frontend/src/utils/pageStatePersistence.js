import React from 'react';

// Page State Persistence Utility
// Saves and restores page state across reloads

export const PageStatePersistence = {
  // Save current page state
  savePageState(path, state = {}) {
    try {
      const pageState = {
        path,
        state,
        timestamp: Date.now()
      };
      
      // Save to sessionStorage (persists across reloads but cleared on tab close)
      sessionStorage.setItem('currentPageState', JSON.stringify(pageState));
      
      // Also save to localStorage for backup (persists across sessions)
      const recentPages = JSON.parse(localStorage.getItem('recentPages') || '[]');
      
      // Remove existing entry for this path
      const filteredPages = recentPages.filter(page => page.path !== path);
      
      // Add current page to beginning
      filteredPages.unshift({
        ...pageState,
        lastVisited: Date.now()
      });
      
      // Keep only last 10 pages
      const updatedPages = filteredPages.slice(0, 10);
      
      localStorage.setItem('recentPages', JSON.stringify(updatedPages));
      
      console.log('Page state saved:', path);
    } catch (error) {
      console.error('Error saving page state:', error);
    }
  },

  // Get current page state
  getCurrentPageState() {
    try {
      const savedState = sessionStorage.getItem('currentPageState');
      if (savedState) {
        const pageState = JSON.parse(savedState);
        
        // Check if state is not too old (30 minutes)
        const maxAge = 30 * 60 * 1000; // 30 minutes
        if (Date.now() - pageState.timestamp < maxAge) {
          return pageState;
        } else {
          // Clear old state
          sessionStorage.removeItem('currentPageState');
        }
      }
    } catch (error) {
      console.error('Error getting page state:', error);
    }
    return null;
  },

  // Get recent pages for navigation
  getRecentPages() {
    try {
      const recentPages = JSON.parse(localStorage.getItem('recentPages') || '[]');
      
      // Filter out pages older than 24 hours
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      const validPages = recentPages.filter(page => 
        Date.now() - page.lastVisited < maxAge
      );
      
      // Update localStorage with filtered pages
      if (validPages.length !== recentPages.length) {
        localStorage.setItem('recentPages', JSON.stringify(validPages));
      }
      
      return validPages;
    } catch (error) {
      console.error('Error getting recent pages:', error);
      return [];
    }
  },

  // Clear page state
  clearPageState() {
    try {
      sessionStorage.removeItem('currentPageState');
      console.log('Page state cleared');
    } catch (error) {
      console.error('Error clearing page state:', error);
    }
  },

  // Get last visited page for role
  getLastVisitedPage(role) {
    try {
      const recentPages = this.getRecentPages();
      
      // Find the most recent page for this role
      const rolePages = recentPages.filter(page => {
        const path = page.path;
        if (role === 'admin' && path.startsWith('/admin')) return true;
        if (role === 'hod' && path.startsWith('/hod')) return true;
        if (role === 'teacher' && path.startsWith('/teacher')) return true;
        if (role === 'student' && path.startsWith('/student')) return true;
        return false;
      });
      
      return rolePages.length > 0 ? rolePages[0] : null;
    } catch (error) {
      console.error('Error getting last visited page:', error);
      return null;
    }
  },

  // Initialize page state persistence
  initialize() {
    console.log('Page state persistence initialized');
  }
};

// Hook for using page state persistence in components
export const usePageStatePersistence = (path, state = {}) => {
  const { useEffect, useMemo } = React;
  
  // Save page state when path or state changes
  useEffect(() => {
    PageStatePersistence.savePageState(path, state);
  }, [path, JSON.stringify(state)]);

  // Get current page state on mount
  const currentPageState = useMemo(() => {
    return PageStatePersistence.getCurrentPageState();
  }, []);

  return {
    savePageState: PageStatePersistence.savePageState,
    getCurrentPageState: PageStatePersistence.getCurrentPageState,
    clearPageState: PageStatePersistence.clearPageState,
    currentPageState
  };
};

// Initialize on import
PageStatePersistence.initialize();
