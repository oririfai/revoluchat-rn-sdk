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
    type?: 'text' | 'image' | 'video' | 'audio' | 'file' | 'system_call_summary';
    text?: string;
    attachments?: Attachment[];
    status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
    createdAt: Date;
    displayTime?: string;
    updatedAt: Date;
    metadata?: Record<string, any>;
}
