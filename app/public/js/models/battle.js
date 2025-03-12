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
      isCharacter: true, 
      characterHealth: 100, 
      opponentHealth: 100, 
      characterMana: 100, 
      opponentMana: 100, 
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
  if (entry.actionType === 'apply-effect' || entry.actionType === 'apply-buff' ||
      entry.actionType === 'buff' || entry.actionType === 'stun-skip') {
    let target = null;
    if (entry.targetId === character.id) {
      target = 'character';
    } else if (entry.targetId === opponent.id) {
      target = 'opponent';
    } else {
      return detectedEffects;
    }
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
  if (entry.actionType === 'effect-expiry' || entry.actionType === 'buff-expiry' || 
      entry.actionType === 'stun-skip') {
    let target = null;
    if (entry.targetId === character.id) {
      target = 'character';
    } else if (entry.targetId === opponent.id) {
      target = 'opponent';
    } else {
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