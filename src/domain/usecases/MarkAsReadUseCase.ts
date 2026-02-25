import { UseCase } from './UseCase';
import { ChatRepository } from '../repositories/ChatRepository';
import { useChatStore } from '../../data/datasources/ChatStore';

interface MarkAsReadParams {
    roomId: string;
    messageId: string;
}

export class MarkAsReadUseCase implements UseCase<void, MarkAsReadParams> {
    constructor(private chatRepository: ChatRepository) { }

    execute({ roomId, messageId }: MarkAsReadParams): void {
        this.chatRepository.markAsRead(roomId, messageId);
        // Optimistically update local state
        useChatStore.getState().updateMessageStatus(roomId, messageId, 'read');
    }
}
