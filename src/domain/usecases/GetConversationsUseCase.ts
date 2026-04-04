import { UseCase } from './UseCase';
import { ChatRepository } from '../repositories/ChatRepository';
import { TenantConfig } from '../entities/TenantConfig';
import { Channel } from '../entities/Channel';
import { MessageMapper } from '../../utils/MessageMapper';

interface GetConversationsParams {
    config: TenantConfig;
    currentUserId: string;
    search?: string;
}

export class GetConversationsUseCase implements UseCase<Promise<Channel[]>, GetConversationsParams> {
    constructor(private chatRepository: ChatRepository) { }

    async execute({ config, currentUserId, search }: GetConversationsParams): Promise<Channel[]> {
        return this.chatRepository.getConversations(config, currentUserId, search);
    }
}
