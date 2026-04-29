import prisma from '../config/prisma.js';

/**
 * Send and store a notification
 * @param {Object} params
 * @param {number} params.user_id - Recipient ID
 * @param {number} params.task_id - Related Task ID
 * @param {string} params.type - Notification type (e.g., task_assigned, task_rejected)
 * @param {string} params.title - Notification title
 * @param {string} params.body - Notification content
 * @param {Object} [tx] - Optional Prisma transaction client
 */
export const sendNotification = async ({ user_id, task_id, type, title, body }, tx = prisma) => {
  try {
    // 1. Create DB Record
    const notification = await tx.notifications.create({
      data: {
        user_id,
        task_id,
        type,
        title,
        body,
        is_read: false
      }
    });

    // 2. Integration Point: Push Notifications (e.g., FCM)
    // Here you would look up the user's fcm_token and trigger the push
    // await fcmService.send(user_id, title, body);

    console.log(`Notification [${type}] sent to User ${user_id} for Task ${task_id}`);
    return notification;
  } catch (error) {
    console.error('Error sending notification:', error);
    // We don't throw here to avoid breaking the main transaction, 
    // unless notifications are mission-critical.
  }
};
