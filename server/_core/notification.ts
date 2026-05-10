/**
 * DEPRECATED: Notification service not implemented.
 * This is a placeholder for future push notification integration.
 */

export async function sendPushNotification(params: {
  userId: string;
  title: string;
  body: string;
}) {
  return {
    success: false,
    message: "Notification service is not yet implemented",
  };
}

export async function scheduleNotification(params: {
  userId: string;
  time: string;
}) {
  return {
    success: false,
    message: "Notification scheduling is not yet implemented",
  };
}

export async function notifyOwner(params: { title: string; content: string }) {
  console.log("Owner notification (placeholder):", params);
  return true;
}
