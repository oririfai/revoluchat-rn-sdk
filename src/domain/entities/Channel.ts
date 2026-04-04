import { User } from './User';
import { Message } from './Message';

export interface Channel {
    id: string;
    name?: string;
    type: 'direct' | 'group' | 'channel';
    members: User[];
    lastMessage?: Message;
    unreadCount: number;
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
    displayTime?: string;
}
