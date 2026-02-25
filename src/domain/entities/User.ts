export interface User {
    id: string;
    name: string;
    avatarUrl?: string;
    role?: string;
    isOnline?: boolean;
    lastSeen?: Date;
    metadata?: Record<string, any>;
}
