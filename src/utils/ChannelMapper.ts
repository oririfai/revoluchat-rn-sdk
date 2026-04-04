import { Channel } from '../domain/entities/Channel';
import { User } from '../domain/entities/User';
import { MessageMapper } from './MessageMapper';

export class ChannelMapper {
    public static mapPayloadToUser(payload: any): User {
        return {
            id: payload.id?.toString(),
            name: payload.name || 'User',
            avatarUrl: payload.avatar_url,
            phone: payload.phone
        };
    }

    public static mapPayloadToChannel(payload: any): Channel {
        const members: User[] = [];
        
        if (payload.user_a) {
            members.push({
                id: payload.user_a.id?.toString(),
                name: payload.user_a.name,
                avatarUrl: payload.user_a.avatar_url,
                phone: payload.user_a.phone
            });
        }
        
        if (payload.user_b) {
            members.push({
                id: payload.user_b.id?.toString(),
                name: payload.user_b.name,
                avatarUrl: payload.user_b.avatar_url,
                phone: payload.user_b.phone
            });
        }

        // If members is empty but it's a direct chat, try to use IDs
        if (members.length === 0 && (payload.user_a_id || payload.user_b_id)) {
            if (payload.user_a_id) members.push({ id: payload.user_a_id.toString(), name: 'User A' });
            if (payload.user_b_id) members.push({ id: payload.user_b_id.toString(), name: 'User B' });
        }

        return {
            id: payload.id.toString(),
            name: payload.name || undefined,
            type: payload.type || 'direct',
            members: members,
            lastMessage: payload.last_message ? MessageMapper.mapPayloadToMessage(payload.last_message, payload.id.toString()) : undefined,
            unreadCount: payload.unread_count || 0,
            metadata: payload.metadata || {},
            createdAt: payload.inserted_at ? new Date(payload.inserted_at) : new Date(),
            updatedAt: payload.updated_at ? new Date(payload.updated_at) : new Date(),
            displayTime: new Date(payload.inserted_at || payload.last_activity_at || new Date()).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })
        };
    }
}
