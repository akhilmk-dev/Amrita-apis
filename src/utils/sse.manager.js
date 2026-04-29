/**
 * SSE (Server-Sent Events) Manager
 * Manages persistent admin connections for real-time notifications
 */

// Map of userId -> Set of SSE response objects (multiple tabs support)
const clients = new Map();

/**
 * Register a new SSE client connection
 * @param {number} userId
 * @param {Object} res - Express response object
 */
export const addClient = (userId, res) => {
  if (!clients.has(userId)) {
    clients.set(userId, new Set());
  }
  clients.get(userId).add(res);
};

/**
 * Remove a disconnected SSE client
 * @param {number} userId
 * @param {Object} res - Express response object
 */
export const removeClient = (userId, res) => {
  if (clients.has(userId)) {
    clients.get(userId).delete(res);
    if (clients.get(userId).size === 0) {
      clients.delete(userId);
    }
  }
};

/**
 * Emit an SSE event to a specific user (all their open tabs)
 * @param {number} userId
 * @param {Object} data - JSON-serializable data
 */
export const emit = (userId, data) => {
  if (clients.has(userId)) {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    clients.get(userId).forEach(res => {
      try {
        res.write(message);
      } catch (err) {
        // Client disconnected unexpectedly
        removeClient(userId, res);
      }
    });
  }
};

/**
 * Emit an SSE event to all connected admin clients
 * @param {Object} data - JSON-serializable data
 */
export const emitToAll = (data) => {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  clients.forEach((resSet) => {
    resSet.forEach(res => {
      try {
        res.write(message);
      } catch (err) {
        // skip disconnected clients
      }
    });
  });
};

export default { addClient, removeClient, emit, emitToAll };
