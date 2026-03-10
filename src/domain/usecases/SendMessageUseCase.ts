import { UseCase } from './UseCase';
import { ChatRepository } from '../repositories/ChatRepository';

interface SendMessageParams {
    roomId: string;
    text: string;
    userId: string;
    attachmentId?: string;
    type?: string;
}

export class SendMessageUseCase implements UseCase<void, SendMessageParams> {
    constructor(private chatRepository: ChatRepository) { }

    execute({ roomId, text, userId, attachmentId, type = "text" }: SendMessageParams): void {
        const messagePayload = {
            body: text,
            user_id: userId,
            type: type,
            attachment_id: attachmentId,
            sent_at: new Date().toISOString(),
        };

        this.chatRepository.sendMessage(roomId, messagePayload);
    }
}
