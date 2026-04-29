import prisma from '../config/prisma.js';
import * as sseManager from './sse.manager.js';

/**
 * Send push notification via OneSignal REST API
 * @param {Object} params
 * @param {string} params.appId - OneSignal App ID
 * @param {string} params.apiKey - OneSignal REST API Key
 * @param {string[]} params.externalUserIds - Array of user IDs to target
 * @param {string} params.title
 * @param {string} params.body
 * @param {Object} params.data - Additional payload data
 */
const sendOneSignalPush = async ({ appId, apiKey, externalUserIds, title, body, data = {} }) => {
  if (!appId || !apiKey) return; // Skip if credentials not configured

  const payload = {
    app_id: appId,
    include_aliases: {
      external_id: externalUserIds.map(String)
    },
    target_channel: 'push',
    headings: { en: title },
    contents: { en: body || title },
    data
  };

  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (!response.ok) {
      console.error('[OneSignal] Push failed:', result);
    } else {
      console.log(`[OneSignal] Push sent to users: ${externalUserIds.join(', ')}`);
    }
  } catch (error) {
    console.error('[OneSignal] Error:', error.message);
  }
};

/**
 * Send and store a notification, then push via OneSignal + SSE
 * @param {Object} params
 * @param {number} params.user_id - Recipient user ID
 * @param {number} params.task_id - Related Task ID (optional)
 * @param {string} params.type - Notification type (e.g. task_assigned, task_rejected)
 * @param {string} params.title - Notification title
 * @param {string} params.body - Notification body
 * @param {string} [params.role_key] - Recipient's role key (for routing to correct OneSignal app)
 * @param {Object} [tx] - Optional Prisma transaction client
 */
export const sendNotification = async ({ user_id, task_id, type, title, body, role_key }, tx = prisma) => {
  try {
    // 1. Save to DB
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

    // 2. OneSignal Push (fire-and-forget, outside transaction)
    const isAdmin = !role_key || role_key !== 'delivery_staff';
    const isStaff = role_key === 'delivery_staff';

    const adminAppId = process.env.ONESIGNAL_ADMIN_APP_ID;
    const adminApiKey = process.env.ONESIGNAL_ADMIN_API_KEY;
    const staffAppId = process.env.ONESIGNAL_STAFF_APP_ID;
    const staffApiKey = process.env.ONESIGNAL_STAFF_API_KEY;

    if (isAdmin && adminAppId && adminApiKey) {
      sendOneSignalPush({
        appId: adminAppId,
        apiKey: adminApiKey,
        externalUserIds: [String(user_id)],
        title,
        body,
        data: { type, task_id: task_id ? String(task_id) : null }
      });
    }

    if (isStaff && staffAppId && staffApiKey) {
      sendOneSignalPush({
        appId: staffAppId,
        apiKey: staffApiKey,
        externalUserIds: [String(user_id)],
        title,
        body,
        data: { type, task_id: task_id ? String(task_id) : null }
      });
    }

    // 3. SSE Push (for Admin React Web Panel)
    if (isAdmin) {
      sseManager.emit(user_id, {
        id: notification.id.toString(),
        type,
        title,
        body,
        task_id,
        is_read: false,
        sent_at: notification.sent_at
      });
    }

    return notification;
  } catch (error) {
    console.error('[Notification] Error sending notification:', error);
    // Don't throw — avoid breaking the main transaction
  }
};

/**
 * Notify all admins about a general event
 * @param {Object} params
 * @param {number} [params.task_id]
 * @param {string} params.type
 * @param {string} params.title
 * @param {string} params.body
 */
export const notifyAdmins = async ({ task_id, type, title, body }) => {
  try {
    // Find all users with admin or super_admin roles (role_id 1 or 2 based on DB check)
    // In a more dynamic system, we'd query by role_key or permissions
    const admins = await prisma.users.findMany({
      where: {
        role_id: { in: [1, 2] },
        is_active: true
      },
      select: { id: true, role: { select: { role_key: true } } }
    });

    for (const admin of admins) {
      await sendNotification({
        user_id: admin.id,
        task_id,
        type,
        title,
        body,
        role_key: admin.role?.role_key || 'admin'
      });
    }
  } catch (error) {
    console.error('[Notification] Error notifying admins:', error);
  }
};
