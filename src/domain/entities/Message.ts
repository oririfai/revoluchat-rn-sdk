import { User } from './User';

export interface Attachment {
    id: string;
    url: string;
    type: string; // 'image' | 'video' | 'audio' | 'file'
    name: string;
}

export interface Message {
    id: string;
    channelId: string;
    sender: User;
    text?: string;
    attachments?: Attachment[];
    status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
    createdAt: Date;
    updatedAt: Date;
    metadata?: Record<string, any>;
}
