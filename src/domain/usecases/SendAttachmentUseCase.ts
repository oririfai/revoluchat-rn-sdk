import { UseCase } from './UseCase';
import { ChatRepository } from '../repositories/ChatRepository';
import { TenantConfig } from '../entities/TenantConfig';

interface SendAttachmentParams {
    roomId: string;
    files: { uri: string; name: string; type: string; size?: number }[];
    config: TenantConfig;
    userId: string;
    text?: string;
}

export class SendAttachmentUseCase implements UseCase<void, SendAttachmentParams> {
    constructor(private chatRepository: ChatRepository) { }

    async execute({ roomId, files, config, userId, text }: SendAttachmentParams): Promise<void> {
        try {
            // 1. Process all files through the 3-step Elixir flow
            const attachments: any[] = [];

            for (const file of files) {
                // a. Init
                const { id, upload_url, upload_method, upload_params } = await this.chatRepository.initAttachment({
                    filename: file.name,
                    mime_type: file.type,
                    size: file.size || 1, // Fallback to 1 if missing, to satisfy backend > 0
                    app_id: config.appId
                }, config);

                // b. Upload (PUT to S3 or POST to Cloudinary)
                await this.chatRepository.uploadMediaToUrl(upload_url, file, upload_method, upload_params);

                // c. Confirm
                await this.chatRepository.confirmAttachment(id, config);

                attachments.push({
                    id: id,
                    type: file.type.startsWith('image/') ? 'image' : 
                          file.type.startsWith('video/') ? 'video' : 
                          file.type.startsWith('audio/') ? 'audio' : 'file',
                    name: file.name,
                });
            }

            // 2. Prepare payload following the multi-attachment strategy
            // Backend only supports one attachment_id natively.
            // We'll put the first one in attachment_id, and all of them in a JSON in body.
            const primaryAttachment = attachments[0];
            const extraData = {
                text: text,
                attachments: attachments // Send all of them here for the SDK to parse
            };

            const messagePayload = {
                body: JSON.stringify(extraData),
                type: 'attachment',
                attachment_id: primaryAttachment?.id,
                user_id: userId,
                sent_at: new Date().toISOString(),
            };

            await this.chatRepository.sendMessage(roomId, messagePayload);
        } catch (error) {
            console.error('[Revoluchat SDK] Multi-attachment upload/send failed', error);
            throw error;
        }
    }
}
