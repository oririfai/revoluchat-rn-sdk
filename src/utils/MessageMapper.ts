import { Message } from '../domain/entities/Message';

export class MessageMapper {
    public static mapPayloadToMessage(payload: any, roomId: string): Message {
        let text = payload.body;
        let extraAttachments: any[] = [];

        // Check if body is JSON (our multi-attachment strategy)
        if (payload.body && (payload.body.startsWith('{') || payload.body.startsWith('['))) {
            try {
                const parsed = JSON.parse(payload.body);
                if (parsed.attachments) {
                    text = parsed.text || '';
                    extraAttachments = parsed.attachments;
                }
            } catch (e) {
                // Not JSON, use as regular text
            }
        }

        const backendAttachment = payload.attachment ? [{
            id: payload.attachment.id?.toString(),
            url: payload.attachment.url?.startsWith('http') ? payload.attachment.url : (payload.attachment.url || `/api/v1/attachments/${payload.attachment.id}/download`),
            type: payload.attachment.mime_type?.startsWith('image/') ? 'image' : 
                  (payload.attachment.mime_type?.startsWith('audio/') || payload.attachment.mime_type === 'application/ogg') ? 'audio' :
                  payload.attachment.mime_type?.startsWith('video/') ? 'video' : 'file',
            name: payload.attachment.filename || payload.attachment.metadata?.filename || 'file',
        }] : [];

        // Primary attachments are from payload.attachments (legacy or if backend supports it later)
        // plus backendAttachment (singular from associations)
        // plus extraAttachments (from our JSON body strategy)
        const allAttachments = [
            ...(payload.attachments || []),
            ...backendAttachment,
            ...extraAttachments
        ];

        // Sort to prioritize items with URLs (starts with http)
        const sortedAttachments = [...allAttachments].sort((a, b) => {
            const aUrl = (a.url || '').startsWith('http') ? 1 : 0;
            const bUrl = (b.url || '').startsWith('http') ? 1 : 0;
            return bUrl - aUrl;
        });

        // Unique by ID (picks the first one after sort, which is the one with a URL)
        const uniqueAttachments = sortedAttachments.filter((v, i, a) => 
            a.findIndex(t => t.id === v.id) === i
        );

        return {
            id: payload.id ? payload.id.toString() : Math.random().toString(36).substr(2, 9),
            channelId: roomId,
            sender: {
                id: (payload.sender_id || (payload.user && payload.user.id) || payload.user_id)?.toString(),
                name: (payload.user && payload.user.name) || payload.username || 'User',
                avatarUrl: payload.user && payload.user.avatar_url,
            },
            text: text,
            attachments: uniqueAttachments.length > 0 ? uniqueAttachments : undefined,
            status: payload.status || 'sent',
            replyToId: payload.reply_to_id?.toString(),
            deletedAt: payload.deleted_at ? new Date(payload.deleted_at) : undefined,
            createdAt: payload.inserted_at ? new Date(payload.inserted_at) : (payload.createdAt ? new Date(payload.createdAt) : new Date()),
            updatedAt: payload.updated_at ? new Date(payload.updated_at) : (payload.updatedAt ? new Date(payload.updatedAt) : new Date()),
            displayTime: new Date(payload.inserted_at || payload.createdAt || new Date()).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }),
        };
    }
}
