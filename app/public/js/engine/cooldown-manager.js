/**
 * Ability cooldown tracking
 */
class CooldownManager {
  constructor() {
    this.cooldowns = new Map(); // Map of ability IDs to end times
  }

  /**
   * Set an ability on cooldown
   * @param {string} abilityId - Ability ID
   * @param {number} duration - Cooldown duration in seconds
   * @param {number} currentTime - Current battle time
   */
  setOnCooldown(abilityId, duration, currentTime) {
    const endTime = currentTime + duration;
    this.cooldowns.set(abilityId, endTime);
  }

  /**
   * Check if an ability is on cooldown
   * @param {string} abilityId - Ability ID
   * @param {number} currentTime - Current battle time
   * @returns {boolean} Whether ability is on cooldown
   */
  isOnCooldown(abilityId, currentTime) {
    if (!this.cooldowns.has(abilityId)) return false;
    
    const endTime = this.cooldowns.get(abilityId);
    return currentTime < endTime;
  }

  /**
   * Get remaining cooldown time
   * @param {string} abilityId - Ability ID
   * @param {number} currentTime - Current battle time
   * @returns {number} Remaining cooldown time in seconds
   */
  getRemainingCooldown(abilityId, currentTime) {
    if (!this.isOnCooldown(abilityId, currentTime)) return 0;
    
    const endTime = this.cooldowns.get(abilityId);
    return Math.max(0, endTime - currentTime);
  }

  /**
   * Get all abilities on cooldown
   * @param {number} currentTime - Current battle time
   * @returns {Map} Map of ability IDs to remaining cooldown times
   */
  getActiveCooldowns(currentTime) {
    const activeCooldowns = new Map();
    
    this.cooldowns.forEach((endTime, abilityId) => {
      const remaining = this.getRemainingCooldown(abilityId, currentTime);
      if (remaining > 0) {
        activeCooldowns.set(abilityId, remaining);
      }
    });
    
    return activeCooldowns;
  }

  /**
   * Reset all cooldowns
   */
  resetAllCooldowns() {
    this.cooldowns.clear();
  }
}