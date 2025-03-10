/**
 * Shared utility functions
 */
class GameUtils {
  /**
   * Generate a random integer between min and max (inclusive)
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {number} Random integer
   */
  randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Format a stat value for display
   * @param {string} stat - Stat name
   * @param {number} value - Stat value
   * @returns {string} Formatted stat
   */
  formatStat(stat, value) {
    switch (stat) {
      case 'attackSpeed':
        return value.toFixed(1) + 's';
      case 'criticalChance':
      case 'spellCritChance':
      case 'physicalDamageReduction':
      case 'magicDamageReduction':
        return value.toFixed(1) + '%';
      case 'minPhysicalDamage':
      case 'maxPhysicalDamage':
      case 'minMagicDamage':
      case 'maxMagicDamage':
        return Math.floor(value);
      default:
        return value;
    }
  }

  /**
   * Format a date for display
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted date
   */
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString();
  }

  /**
   * Format a time duration in seconds to mm:ss format
   * @param {number} seconds - Time in seconds
   * @returns {string} Formatted time
   */
  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Calculate a percentage safely (avoiding division by zero)
   * @param {number} value - Current value
   * @param {number} max - Maximum value
   * @returns {number} Percentage (0-100)
   */
  calculatePercentage(value, max) {
    if (max <= 0) return 0;
    return (value / max) * 100;
  }

  /**
   * Get the appropriate class for an ability card based on its type
   * @param {Object} ability - Ability object
   * @returns {string} CSS class
   */
  getAbilityCardClass(ability) {
    if (!ability) return '';
    
    if (ability.healEffect) {
      return 'heal';
    } else if (ability.buffEffect) {
      return 'buff';
    } else if (ability.periodicEffect) {
      return 'periodic';
    } else if (ability.dotEffect) {
      return 'dot';
    } else {
      return ability.type; // 'magic' or 'physical'
    }
  }

  /**
   * Get a user-friendly ability type label
   * @param {Object} ability - Ability object
   * @returns {string} Ability type label
   */
  getAbilityTypeLabel(ability) {
    if (!ability) return '';
    
    if (ability.healEffect) {
      return 'Heal';
    } else if (ability.buffEffect) {
      if (ability.buffEffect.targetsSelf === false) {
        return 'Debuff';
      }
      return 'Buff';
    } else if (ability.periodicEffect) {
      return ability.periodicEffect.type === 'manaDrain' ? 'Mana Drain' : 'Periodic';
    } else if (ability.dotEffect) {
      return 'DoT';
    } else {
      return ability.type === 'magic' ? 'Magic' : 'Physical';
    }
  }

  /**
   * Debounce a function call
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in milliseconds
   * @returns {Function} Debounced function
   */
  debounce(func, wait) {
    let timeout;
    return function(...args) {
      const context = this;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), wait);
    };
  }
}