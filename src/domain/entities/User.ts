export interface User {
    id: string;
    chatId?: string;
    name: string;
    phone?: string;
    avatarUrl?: string;
    role?: string;
    isOnline?: boolean;
    lastSeen?: Date;
    metadata?: Record<string, any>;
}
