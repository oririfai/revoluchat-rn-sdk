import { UseCase } from './UseCase';
import { ChatRepository } from '../repositories/ChatRepository';
import { TenantConfig } from '../entities/TenantConfig';

interface SendAttachmentParams {
    roomId: string;
    file: { uri: string; name: string; type: string };
    config: TenantConfig;
    userId: string;
    text?: string;
}

export class SendAttachmentUseCase implements UseCase<void, SendAttachmentParams> {
    constructor(private chatRepository: ChatRepository) { }

    async execute({ roomId, file, config, userId, text }: SendAttachmentParams): Promise<void> {
        try {
            // 1. Upload the file
            const uploadResult = await this.chatRepository.uploadMedia(file, config);

            // 2. Send the message with attachment info
            const messagePayload = {
                body: text,
                type: 'attachment',
                attachments: [
                    {
                        id: Math.random().toString(36).substr(2, 9),
                        url: uploadResult.url,
                        type: uploadResult.type,
                        name: file.name,
                    }
                ],
                user_id: userId,
                sent_at: new Date().toISOString(),
            };

            this.chatRepository.sendMessage(roomId, messagePayload);
        } catch (error) {
            console.error('[Revoluchat SDK] Attachment upload/send failed', error);
            throw error;
        }
    }
}
