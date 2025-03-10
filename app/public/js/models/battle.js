/**
 * Battle state model
 */
class BattleModel {
  /**
   * Create a battle state object
   * @param {Object} character - Player character
   * @param {Object} opponent - Opponent character
   * @returns {Object} Battle state
   */
  static createBattleState(character, opponent) {
    return {
      character: Character.createBattleState(character),
      opponent: Character.createBattleState(opponent),
      isCharacter: true, // Whether player character is on the left side
      characterHealth: 100, // Percentage
      opponentHealth: 100, // Percentage
      characterMana: 100, // Percentage
      opponentMana: 100, // Percentage
      characterEffects: [],
      opponentEffects: [],
      log: [],
      currentLogIndex: 0,
      startTime: new Date(),
      isFinished: false
    };
  }
  
  static parseEffectsFromData(entry, character, opponent) {
  const detectedEffects = [];
  
  // Use only structured data, no string parsing
  if (entry.actionType === 'apply-effect' || entry.actionType === 'apply-buff' ||
      entry.actionType === 'buff' || entry.actionType === 'stun-skip') {
    
    // Determine target based on targetId
    let target = null;
    if (entry.targetId === character.id) {
      target = 'character';
    } else if (entry.targetId === opponent.id) {
      target = 'opponent';
    } else {
      // No valid target ID, can't process this effect
      return detectedEffects;
    }
    
    // Create effect object
    detectedEffects.push({
      type: entry.effectType,
      name: entry.effectName || entry.abilityId || entry.effectType,
      target,
      amount: entry.effectAmount,
      damage: entry.damage,
      duration: entry.effectDuration
    });
  }
  
  return detectedEffects;
}

  /**
   * Detect effect expiration from a log message
   * @param {string} message - Log message
   * @param {Object} character - Character object
   * @param {Object} opponent - Opponent object
   * @returns {Object|null} Expired effect info or null
   */
static parseEffectExpiration(entry, character, opponent) {
  // Only use structured data, no string parsing
  if (entry.actionType === 'effect-expiry' || entry.actionType === 'buff-expiry' || 
      entry.actionType === 'stun-skip') {
    
    let target = null;
    if (entry.targetId === character.id) {
      target = 'character';
    } else if (entry.targetId === opponent.id) {
      target = 'opponent';
    } else {
      // No valid target ID, can't process this expiration
      return null;
    }
    
    return {
      name: entry.effectName,
      type: entry.effectType,
      target
    };
  }
  
  return null;
}
}