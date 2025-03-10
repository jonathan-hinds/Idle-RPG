/**
 * User notifications
 */
class NotificationUI {
  /**
   * Show a notification
   * @param {string} message - Message to display
   * @param {string} type - Notification type ('success', 'error', 'info')
   * @param {number} duration - Display duration in ms (default 3000)
   */
  show(message, type = 'info', duration = 3000) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Add to document
    document.body.appendChild(notification);
    
    // Remove after duration
    setTimeout(() => {
      notification.classList.add('fadeOut');
      setTimeout(() => {
        notification.remove();
      }, 500);
    }, duration);
    
    return notification;
  }

  /**
   * Show a success notification
   * @param {string} message - Message to display
   * @param {number} duration - Display duration in ms
   */
  success(message, duration = 3000) {
    return this.show(message, 'success', duration);
  }

  /**
   * Show an error notification
   * @param {string} message - Message to display
   * @param {number} duration - Display duration in ms
   */
  error(message, duration = 3000) {
    return this.show(message, 'error', duration);
  }

  /**
   * Show an info notification
   * @param {string} message - Message to display
   * @param {number} duration - Display duration in ms
   */
  info(message, duration = 3000) {
    return this.show(message, 'info', duration);
  }
}