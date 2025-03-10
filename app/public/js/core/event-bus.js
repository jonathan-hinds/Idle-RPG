/**
 * Centralized event system
 */
class EventBus {
  constructor() {
    this.events = {};
  }

/**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   * @returns {Function} Unsubscribe function
   */
  subscribe(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    
    this.events[event].push(callback);
    
    // Return unsubscribe function
    return () => {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    };
  }

  /**
   * Publish an event
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  publish(event, data) {
    if (this.events[event]) {
      this.events[event].forEach(callback => {
        callback(data);
      });
    }
  }

  /**
   * Clear all events
   */
  clear() {
    this.events = {};
  }
}