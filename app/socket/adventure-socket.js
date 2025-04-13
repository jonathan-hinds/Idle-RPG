/**
 * Socket.io handlers for Adventure Mode
 */
const adventureService = require('../services/adventure-service');

/**
 * Set up adventure-related socket handlers
 * @param {Object} io - Socket.io instance
 */
function setupAdventureHandlers(io) {
  io.on('connection', (socket) => {
    console.log('Client connected to socket:', socket.id);
    
    // Handle client subscribing to adventure updates
    socket.on('adventure:subscribe', (data) => {
      const { characterId } = data;
      
      if (!characterId) {
        return socket.emit('error', { message: 'Character ID is required' });
      }
      
      console.log(`Client ${socket.id} subscribed to adventure updates for character ${characterId}`);
      
      // Join a room specific to this character
      socket.join(`adventure:${characterId}`);
      
      // Send initial adventure status
      try {
        const status = adventureService.getAdventureStatus(characterId);
        socket.emit('adventure:status', status);
      } catch (error) {
        console.error('Error getting adventure status:', error);
        socket.emit('error', { message: 'Failed to get adventure status' });
      }
    });
    
    // Handle client unsubscribing from adventure updates
    socket.on('adventure:unsubscribe', (data) => {
      const { characterId } = data;
      
      if (!characterId) {
        return;
      }
      
      console.log(`Client ${socket.id} unsubscribed from adventure updates for character ${characterId}`);
      
      // Leave the character-specific room
      socket.leave(`adventure:${characterId}`);
    });
    
    // Handle client requesting adventure status
    socket.on('adventure:request-status', (data) => {
      const { characterId } = data;
      
      if (!characterId) {
        return socket.emit('error', { message: 'Character ID is required' });
      }
      
      try {
        const status = adventureService.getAdventureStatus(characterId);
        socket.emit('adventure:status', status);
      } catch (error) {
        console.error('Error getting adventure status:', error);
        socket.emit('error', { message: 'Failed to get adventure status' });
      }
    });
    
    // Handle client requesting to process a combat event
    socket.on('adventure:combat-request', (data) => {
      const { adventureId } = data;
      
      if (!adventureId) {
        return socket.emit('error', { message: 'Adventure ID is required' });
      }
      
      try {
        // Get the adventure to check if it exists and get the character ID
        const adventure = adventureService.getAdventure(adventureId);
        
        if (!adventure) {
          return socket.emit('error', { message: 'Adventure not found' });
        }
        
        const characterId = adventure.characterId;
        
        // Process the combat event
        const result = adventureService.processCombatEvent(adventureId);
        
        // Broadcast the combat result to all clients in the character's room
        io.to(`adventure:${characterId}`).emit('adventure:combat', {
          characterId,
          adventureId,
          battleId: result.battle.id,
          isVictory: result.battle.winner === characterId,
          adventureStatus: result.adventure.status
        });
        
        // Send the full result to the requesting client
        socket.emit('adventure:combat-result', result);
        
        // Update the adventure status for all clients in the room
        const status = adventureService.getAdventureStatus(characterId);
        io.to(`adventure:${characterId}`).emit('adventure:status', status);
      } catch (error) {
        console.error('Error processing combat:', error);
        socket.emit('error', { message: error.message || 'Failed to process combat' });
      }
    });
  });
  
  // Set up timer to periodically update adventure statuses
  setInterval(() => {
    // Check all active adventures
    const adventures = require('../utils/data-utils').readDataFile('adventures.json');
    const activeAdventures = adventures.filter(a => a.status === 'active');
    
    for (const adventure of activeAdventures) {
      try {
        // Process a tick for this adventure
        const updatedAdventure = adventureService.processAdventureTick(adventure.id);
        
        // If the adventure status changed, send an update to all clients in the room
        if (updatedAdventure.status !== 'active') {
          io.to(`adventure:${updatedAdventure.characterId}`).emit('adventure:completed', {
            characterId: updatedAdventure.characterId,
            adventureId: updatedAdventure.id,
            status: updatedAdventure.status,
            rewards: updatedAdventure.rewards
          });
        }
        
        // Send the current status to all clients in the room
        const status = adventureService.getAdventureStatus(updatedAdventure.characterId);
        io.to(`adventure:${updatedAdventure.characterId}`).emit('adventure:status', status);
      } catch (error) {
        console.error(`Error processing adventure tick for adventure ${adventure.id}:`, error);
      }
    }
  }, 5000); // Check every 5 seconds
}

module.exports = {
  setupAdventureHandlers
};