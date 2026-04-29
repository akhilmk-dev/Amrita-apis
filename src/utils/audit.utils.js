import prisma from '../config/prisma.js';

/**
 * Creates an audit log entry
 * @param {Object} params - Audit log parameters
 * @param {Object} req - Express request object (to extract user, IP, UA)
 * @param {string} action - Action performed (add, edit, delete, etc.)
 * @param {string} entityType - Module name
 * @param {string|number} entityId - ID of the affected record
 * @param {Object} oldValue - Previous state (optional)
 * @param {Object} newValue - New state (optional)
 * @param {Object} meta - Additional metadata/response (optional)
 */
export const createAuditLog = async ({
  req,
  action,
  entityType,
  entityId,
  oldValue = null,
  newValue = null,
  meta = null
}) => {
  try {
    const user = req.user; // Populated by authMiddleware
    
    await prisma.audit_logs.create({
      data: {
        user_id: user?.user_id || null,
        role_id: user?.role_id || null,
        action,
        entity_type: entityType,
        entity_id: String(entityId),
        old_value: oldValue,
        new_value: newValue,
        meta: meta,
        ip_address: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        user_agent: req.headers['user-agent']
      }
    });
  } catch (error) {
    // We log the error but don't throw it to avoid breaking the main request flow
    console.error('Audit Log Error:', error);
  }
};
