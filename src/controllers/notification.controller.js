import prisma from '../config/prisma.js';
import { successResponse, ApiError } from '../utils/response.utils.js';
import { getPaginationParams, getPaginatedResponse } from '../utils/pagination.utils.js';
import * as sseManager from '../utils/sse.manager.js';

/**
 * SSE stream endpoint for the Admin React Web Panel
 * The React app connects here with Authorization header (via fetch-event-source)
 */
export const streamNotifications = async (req, res, next) => {
  try {
    const userId = req.user.user_id;

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering if behind proxy
    res.flushHeaders();

    // Send initial connection confirmation
    res.write(`data: ${JSON.stringify({ type: 'connected', message: 'SSE stream connected' })}\n\n`);

    // Register this client
    sseManager.addClient(userId, res);

    // Keep-alive heartbeat every 30 seconds
    const heartbeat = setInterval(() => {
      try {
        res.write(`: heartbeat\n\n`);
      } catch (e) {
        clearInterval(heartbeat);
      }
    }, 30000);

    // Clean up on disconnect
    req.on('close', () => {
      clearInterval(heartbeat);
      sseManager.removeClient(userId, res);
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get paginated notifications for the logged-in user
 */
export const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const { page, limit, skip } = getPaginationParams(req.query);
    const { unread_only } = req.query;

    const where = {
      user_id: userId,
      ...(unread_only === 'true' ? { is_read: false } : {})
    };

    const [count, notifications] = await Promise.all([
      prisma.notifications.count({ where }),
      prisma.notifications.findMany({
        where,
        skip,
        take: limit,
        orderBy: { sent_at: 'desc' },
        include: {
          task: {
            select: {
              id: true,
              patient_name: true,
              status: true
            }
          }
        }
      })
    ]);

    const unreadCount = await prisma.notifications.count({
      where: { user_id: userId, is_read: false }
    });

    const response = getPaginatedResponse({ count, page, limit, data: notifications });
    response.unread_count = unreadCount;

    return successResponse(res, response, 'Notifications retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Mark a single notification as read
 */
export const markAsRead = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const { id } = req.params;

    const notification = await prisma.notifications.findUnique({
      where: { id: BigInt(id) }
    });

    if (!notification || notification.user_id !== userId) {
      throw new ApiError('Notification not found', 404);
    }

    const updated = await prisma.notifications.update({
      where: { id: BigInt(id) },
      data: { is_read: true, read_at: new Date() }
    });

    return successResponse(res, updated, 'Notification marked as read');
  } catch (error) {
    next(error);
  }
};

/**
 * Mark all notifications as read for the logged-in user
 */
export const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.user_id;

    await prisma.notifications.updateMany({
      where: { user_id: userId, is_read: false },
      data: { is_read: true, read_at: new Date() }
    });

    return successResponse(res, null, 'All notifications marked as read');
  } catch (error) {
    next(error);
  }
};
