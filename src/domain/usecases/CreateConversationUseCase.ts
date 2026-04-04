import { UseCase } from './UseCase';
import { ChatRepository } from '../repositories/ChatRepository';
import { TenantConfig } from '../entities/TenantConfig';
import { Channel } from '../entities/Channel';

interface CreateConversationParams {
    config: TenantConfig;
    currentUserId: string;
    targetUserId: string;
}

export class CreateConversationUseCase implements UseCase<Promise<Channel>, CreateConversationParams> {
    constructor(private chatRepository: ChatRepository) { }

    async execute({ config, currentUserId, targetUserId }: CreateConversationParams): Promise<Channel> {
        const channel = await this.chatRepository.createConversation(config, currentUserId, targetUserId);
        return channel;
    }
}
