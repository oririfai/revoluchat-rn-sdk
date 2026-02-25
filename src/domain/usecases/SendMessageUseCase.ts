import { UseCase } from './UseCase';
import { ChatRepository } from '../repositories/ChatRepository';

interface SendMessageParams {
    roomId: string;
    text: string;
    userId: string;
}

export class SendMessageUseCase implements UseCase<void, SendMessageParams> {
    constructor(private chatRepository: ChatRepository) { }

    execute({ roomId, text, userId }: SendMessageParams): void {
        const messagePayload = {
            body: text,
            user_id: userId,
            sent_at: new Date().toISOString(),
        };

        this.chatRepository.sendMessage(roomId, messagePayload);
    }
}
