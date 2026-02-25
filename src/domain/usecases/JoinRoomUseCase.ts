import { UseCase } from './UseCase';
import { ChatRepository } from '../repositories/ChatRepository';
import { useChatStore } from '../../data/datasources/ChatStore';
import { Message } from '../entities/Message';

interface JoinRoomParams {
    roomId: string;
}

export class JoinRoomUseCase implements UseCase<void, JoinRoomParams> {
    constructor(private chatRepository: ChatRepository) { }

    execute({ roomId }: JoinRoomParams): void {
        const store = useChatStore.getState();

        this.chatRepository.joinRoom(roomId, (payload: any) => {
            const newMessage: Message = {
                id: payload.id || Math.random().toString(36).substr(2, 9),
                channelId: roomId,
                sender: {
                    id: payload.user_id,
                    name: payload.username || 'System',
                },
                text: payload.body,
                status: 'sent',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            store.addMessage(roomId, newMessage);
        });
    }
}
