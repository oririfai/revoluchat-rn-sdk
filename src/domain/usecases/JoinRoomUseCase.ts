import { UseCase } from './UseCase';
import { ChatRepository } from '../repositories/ChatRepository';
import { useChatStore } from '../../data/datasources/ChatStore';
import { Message } from '../entities/Message';
import { MessageMapper } from '../../utils/MessageMapper';

interface JoinRoomParams {
    roomId: string;
    userId?: string;
}

export class JoinRoomUseCase implements UseCase<void, JoinRoomParams> {
    constructor(private chatRepository: ChatRepository) { }

    async execute({ roomId, userId }: JoinRoomParams): Promise<void> {
        const store = useChatStore.getState();
        store.setActiveChannelId(roomId);

        const { messages } = await this.chatRepository.joinRoom(
            roomId, 
            (payload: any) => {
                const newMessage: Message = MessageMapper.mapPayloadToMessage(payload, roomId);
                store.addMessage(roomId, newMessage);

                // Auto-mark as read if it's not our own message
                if (userId && newMessage.sender.id?.toString() !== userId.toString()) {
                    this.chatRepository.markAsRead(roomId, newMessage.id);
                    store.resetUnreadCount(roomId);
                }
            },
            (receipt: any) => {
                if (receipt.message_id) {
                    store.updateMessageStatus(roomId, receipt.message_id, 'read');
                }
            }
        );
 
         // Reset local unread count when entering room
         store.resetUnreadCount(roomId);
 
         if (messages && messages.length > 0) {
             const history = messages.map(m => MessageMapper.mapPayloadToMessage(m, roomId));
             store.setMessages(roomId, history);
             
             // Mark all unread messages from history as read
             history.forEach(msg => {
                 if (msg.status !== 'read' && msg.sender.id?.toString() !== userId?.toString()) {
                     this.chatRepository.markAsRead(roomId, msg.id);
                     store.updateMessageStatus(roomId, msg.id, 'read');
                 }
             });
         }
    }
}
