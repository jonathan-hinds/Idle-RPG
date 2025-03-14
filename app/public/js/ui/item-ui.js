/**
 * Item and inventory display
 */
class ItemUI {
  constructor() {
    this._initElements();
  }
  /**
   * Initialize UI elements
   */
  _initElements() {
    this.elements = {
      inventoryList: document.getElementById('inventory-list'),
      equipmentSlots: document.getElementById('equipment-slots'),
      shopItemsList: document.getElementById('shop-items-list')
    };
  }
/**
 * Render inventory items
 * @param {Object} inventory - Character inventory
 * @param {Array} allItems - All available items
 */
/**
* Render inventory items
* @param {Object} inventory - Character inventory
* @param {Array} allItems - All available items
*/
renderInventory(inventory, allItems) {
const container = this.elements.inventoryList;
if (!container) return;
const inventoryItems = inventory.items
  .map(itemId => allItems.find(item => item.id === itemId))
  .filter(item => item); 
if (inventoryItems.length === 0) {
  container.innerHTML = '<div class="alert alert-info">No items in inventory. Visit the shop to buy items.</div>';
  return;
}
const groupedItems = {
  weapon: [],
  armor: []
};
inventoryItems.forEach(item => {
  if (groupedItems[item.type]) {
    groupedItems[item.type].push(item);
  } else {
    groupedItems[item.type] = [item];
  }
});

// Get character attributes for damage scaling
const attributes = window.GameState.selectedCharacter ? window.GameState.selectedCharacter.attributes : null;

let html = '<div class="inventory-grid">';
Object.entries(groupedItems).forEach(([type, items]) => {
  if (items.length > 0) {
    html += `<h5 class="inventory-group-title">${type.charAt(0).toUpperCase() + type.slice(1)}s</h5>`;
    html += '<div class="inventory-group">';
    items.forEach(item => {
      html += `
        <div class="inventory-item ${item.type}" data-item-id="${item.id}">
          <div class="inventory-item-content">
            <div class="inventory-item-name">${item.name}</div>
            <div class="inventory-item-slot">${this._formatSlotName(item.slot)}</div>`;
            
      // Add weapon damage display if it's a weapon
      if (item.type === 'weapon' && item.minDamage) {
        html += `<div class="inventory-item-damage text-primary">${this._formatWeaponDamage(item, attributes)}</div>`;
        html += `<div class="inventory-item-scaling mt-1">${this._formatWeaponScaling(item)}</div>`;
      }
            
      html += `<div class="inventory-item-stats">
              ${this._formatItemStatsShort(item.stats)}
            </div>`;
        
      if (item.effect) {
        html += `<div class="inventory-item-effect">${this._formatItemEffect(item.effect)}</div>`;
      }
      html += `</div>
        <button class="btn btn-sm btn-primary equip-item-btn" data-item-id="${item.id}">Equip</button>
      </div>
      `;
    });
    html += '</div>';
  }
});
html += '</div>';
container.innerHTML = html;
}
/**
 * Format item stats for a shorter display
 * @param {Object} stats - Item stats
 * @returns {string} Formatted stats HTML
 */
_formatItemStatsShort(stats) {
  if (!stats || Object.keys(stats).length === 0) return 'No stats';
  return Object.entries(stats)
    .map(([stat, value]) => {
      const sign = value > 0 ? '+' : '';
      return `<span class="stat-item">${sign}${value} ${this._formatStatName(stat)}</span>`;
    })
    .join(' ');
}
  /**
   * Render equipment slots
   * @param {Object} equipment - Equipped items
   */
/**
 * Render equipment slots
 * @param {Object} equipment - Equipped items
 */
/**
* Render equipment slots
* @param {Object} equipment - Equipped items
*/
renderEquipment(equipment) {
const container = this.elements.equipmentSlots;
if (!container) return;
const slots = ['head', 'chest', 'legs', 'mainHand', 'offHand'];

// Get character attributes for damage scaling
const attributes = window.GameState.selectedCharacter ? window.GameState.selectedCharacter.attributes : null;

let html = '<div class="equipment-slots">';
slots.forEach(slot => {
  const item = equipment[slot];
  const slotName = this._formatSlotName(slot);
  html += `
    <div class="equipment-slot" data-slot="${slot}">
      <div class="slot-name">${slotName}</div>
      <div class="slot-item ${item ? item.type : 'empty'}">`;
        
  if (item) {
    html += `
      <div class="inventory-item-content">
        <div class="item-name">${item.name}</div>`;
        
    // Add weapon damage and scaling if it's a weapon
    if (item.type === 'weapon' && item.minDamage) {
      html += `<div class="item-damage text-primary mb-1">${this._formatWeaponDamage(item, attributes)}</div>`;
      html += `<div class="item-scaling mb-1">${this._formatWeaponScaling(item)}</div>`;
    }
        
    html += `<div class="item-stats">${this._formatItemStats(item.stats)}</div>`;
    
    if (item.effect) {
      html += `<div class="inventory-item-effect">${this._formatItemEffect(item.effect)}</div>`;
    }
    
    html += `
      </div>
      <button class="btn btn-sm btn-danger unequip-item-btn" data-slot="${slot}">Unequip</button>`;
  } else {
    html += '<div class="empty-slot">Empty</div>';
  }
  
  html += `
      </div>
    </div>
  `;
});

html += '</div>';
container.innerHTML = html;
}
  /**
   * Render shop items
   * @param {Array} items - All available items
   */
/**
* Render shop items
* @param {Array} items - All available items
*/
renderShopItems(items) {
const container = this.elements.shopItemsList;
if (!container) return;
const groupedItems = {
  weapon: [],
  armor: []
};
items.forEach(item => {
  if (groupedItems[item.type]) {
    groupedItems[item.type].push(item);
  } else {
    groupedItems[item.type] = [item];
  }
});

// Get character attributes for damage scaling
const attributes = window.GameState.selectedCharacter ? window.GameState.selectedCharacter.attributes : null;

let html = '';
Object.entries(groupedItems).forEach(([type, typeItems]) => {
  if (typeItems.length > 0) {
    html += `<h5>${type.charAt(0).toUpperCase() + type.slice(1)}s</h5>`;
    html += '<div class="row">';
    typeItems.forEach(item => {
      html += `
        <div class="col-md-4 mb-3">
          <div class="card shop-item ${item.type}">
            <div class="card-body">
              <h5 class="card-title">${item.name}</h5>
              <p class="card-text">
                <strong>Type:</strong> ${item.type}<br>
                <strong>Slot:</strong> ${this._formatSlotName(item.slot)}
                ${item.twoHanded ? '<br><strong>Two-handed</strong>' : ''}
              </p>`;
              
              // Add weapon damage and scaling
              if (item.type === 'weapon' && item.minDamage) {
                html += `<div class="item-damage mb-2"><strong>Damage:</strong> ${this._formatWeaponDamage(item, attributes)}</div>`;
                html += `<div class="item-scaling mb-2"><strong>Scaling:</strong> ${this._formatWeaponScaling(item)}</div>`;
              }
              
              html += `<div class="item-stats mb-2">
                ${this._formatItemStatsDetailed(item.stats)}
              </div>
              ${item.effect ? `
                <div class="item-effect mb-2">
                  <strong>Effect:</strong> ${this._formatItemEffect(item.effect)}
                </div>
              ` : ''}
              <div class="d-flex justify-content-between align-items-center">
                <span class="item-price">${item.price} gold</span>
                <button class="btn btn-primary buy-item-btn" data-item-id="${item.id}">Buy</button>
              </div>
            </div>
          </div>
        </div>
      `;
    });
    html += '</div>';
  }
});
container.innerHTML = html;
}
  /**
   * Format slot name for display
   * @param {string} slot - Slot name
   * @returns {string} Formatted slot name
   */
  _formatSlotName(slot) {
    switch(slot) {
      case 'mainHand': return 'Main Hand';
      case 'offHand': return 'Off Hand';
      default: return slot.charAt(0).toUpperCase() + slot.slice(1);
    }
  }
/**
* Format item stats for compact display
* @param {Object} stats - Item stats
* @returns {string} Formatted stats string
*/
_formatItemStats(stats) {
if (!stats) return '';
return Object.entries(stats)
  .map(([stat, value]) => {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value} ${stat}`;
  })
  .join(', ');
}

/**
* Format weapon damage with scaling for display
* @param {Object} weapon - Weapon data
* @param {Object} attributes - Character attributes if available
* @returns {string} Formatted damage display
*/
_formatWeaponDamage(weapon, attributes = null) {
if (weapon.type !== 'weapon' || (!weapon.minDamage && !weapon.maxDamage)) {
  return '';
}

let damageText = `${weapon.minDamage}-${weapon.maxDamage} damage`;

// If we have attributes, calculate scaled damage
if (attributes && weapon.scaling) {
  const scaledDamage = Item.calculateWeaponDamage(weapon, attributes);
  damageText = `${scaledDamage.minDamage}-${scaledDamage.maxDamage} damage`;
  
  // If there's a significant difference, show the base damage too
  if (scaledDamage.minDamage > weapon.minDamage || scaledDamage.maxDamage > weapon.maxDamage) {
    damageText += ` (Base: ${weapon.minDamage}-${weapon.maxDamage})`;
  }
}

return damageText;
}

/**
* Format weapon scaling for display
* @param {Object} weapon - Weapon data
* @returns {string} Formatted scaling HTML
*/
_formatWeaponScaling(weapon) {
if (weapon.type !== 'weapon' || !weapon.scaling || weapon.scaling.length === 0) {
  return '';
}

return weapon.scaling.map(scaling => {
  const statName = this._formatStatName(scaling.stat);
  const gradeClass = Item.getScalingGradeClass(scaling.grade);
  return `<span class="stat-item">${statName}: <span class="${gradeClass}">${scaling.grade}</span></span>`;
}).join(' ');
}
  /**
   * Format item stats for detailed display
   * @param {Object} stats - Item stats
   * @returns {string} Formatted stats HTML
   */
  _formatItemStatsDetailed(stats) {
    if (!stats || Object.keys(stats).length === 0) return 'No stat bonuses';
    return Object.entries(stats)
      .map(([stat, value]) => {
        const sign = value > 0 ? '+' : '';
        return `<div><strong>${this._formatStatName(stat)}:</strong> ${sign}${value}</div>`;
      })
      .join('');
  }
  /**
   * Format stat name for display
   * @param {string} stat - Stat name
   * @returns {string} Formatted stat name
   */
  _formatStatName(stat) {
    switch(stat) {
      case 'strength': return 'Strength';
      case 'agility': return 'Agility';
      case 'stamina': return 'Stamina';
      case 'intellect': return 'Intellect';
      case 'wisdom': return 'Wisdom';
      case 'criticalChance': return 'Critical Chance';
      case 'spellCritChance': return 'Spell Crit Chance';
      case 'attackSpeed': return 'Attack Speed';
      case 'blockChance': return 'Block Chance';
      case 'dodgeChance': return 'Dodge Chance';
      case 'accuracy': return 'Accuracy';
      case 'physicalDamageReduction': return 'Physical Reduction';
      case 'magicDamageReduction': return 'Magic Reduction';
      default: return stat.charAt(0).toUpperCase() + stat.slice(1).replace(/([A-Z])/g, ' $1');
    }
  }
  /**
   * Format item effect for display
   * @param {Object} effect - Item effect
   * @returns {string} Formatted effect description
   */
  _formatItemEffect(effect) {
    if (!effect) return '';
    let description = '';
    switch(effect.type) {
      case 'stun':
        description = `${effect.chance}% chance to stun target on basic attack`;
        break;
      case 'poison':
        description = `${effect.chance}% chance to poison target for ${effect.damage} damage over ${effect.duration} seconds`;
        break;
      case 'burning':
        description = `${effect.chance}% chance to burn target for ${effect.damage} damage over ${effect.duration} seconds`;
        break;
      case 'manaDrain':
        description = `${effect.chance}% chance to drain ${effect.amount} mana per second`;
        break;
      default:
        description = `${effect.chance}% chance to apply ${effect.type} effect`;
    }
    return description;
  }
}