import { api } from "./api";

/**
 * Creates a notification for a specific user.
 * @param {string} userId - The ID of the student receiving the notification.
 * @param {string} title - The notification title.
 * @param {string} message - The notification body.
 * @param {'booking' | 'event' | 'info'} type - The category of the notification.
 */
export const createNotification = async (userId, title, message, type = 'info') => {
  if (!userId) return;
  
  try {
    await api.createNotification({
      userId,
      title,
      message,
      type
    });
  } catch (error) {
    console.error("Error creating notification:", error);
  }
};
