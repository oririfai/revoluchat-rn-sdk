import { UseCase } from './UseCase';
import { ChatRepository } from '../repositories/ChatRepository';
import { TenantConfig } from '../entities/TenantConfig';
import { Channel } from '../entities/Channel';

interface GetConversationsParams {
    config: TenantConfig;
    search?: string;
}

export class GetConversationsUseCase implements UseCase<Promise<Channel[]>, GetConversationsParams> {
    constructor(private chatRepository: ChatRepository) { }

    async execute({ config, search }: GetConversationsParams): Promise<Channel[]> {
        const response = await this.chatRepository.getConversations(config, search);

        // Map backend response to SDK Channel entity
        // Backend returns { conversations: [...] }
        return (response.conversations || []).map((c: any) => ({
            id: c.id,
            name: c.user_a?.name || c.user_b?.name || 'Unknown',
            type: 'direct',
            members: [c.user_a, c.user_b].filter(Boolean),
            lastMessage: c.last_message ? {
                id: c.last_message.id,
                text: c.last_message.body,
                sender: { id: c.last_message.sender_id.toString() },
                createdAt: new Date(c.last_message.inserted_at),
                status: c.last_message.status,
            } : undefined,
            unreadCount: c.unread_count || 0,
            createdAt: new Date(c.inserted_at),
            updatedAt: new Date(c.last_activity_at || c.inserted_at),
        }));
    }
}
