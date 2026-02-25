import { Message } from '../domain/entities/Message';

/**
 * Handles Push Notification parsing and device token registration.
 * Designed to be used with @react-native-firebase/messaging or similar.
 */
export class RevoluchatNotifications {
    /**
     * Parse a remote message (FCM/APNS) into a Revoluchat Message entity.
     * Useful for showing local notifications or updating state on background wake.
     */
    static parseRemoteMessage(remoteMessage: any): Message | null {
        const data = remoteMessage.data;
        if (!data || data.source !== 'revoluchat') return null;

        try {
            return {
                id: data.id,
                channelId: data.channel_id,
                sender: {
                    id: data.sender_id,
                    name: data.sender_name,
                },
                text: data.body,
                status: 'sent',
                createdAt: new Date(data.created_at),
                updatedAt: new Date(data.updated_at),
                metadata: data.metadata ? JSON.parse(data.metadata) : undefined,
            };
        } catch (e) {
            console.error('[Revoluchat SDK] Failed to parse notification', e);
            return null;
        }
    }

    /**
     * Helper to identify if a notification originates from Revoluchat.
     */
    static isRevoluchatNotification(remoteMessage: any): boolean {
        return remoteMessage?.data?.source === 'revoluchat';
    }
}
