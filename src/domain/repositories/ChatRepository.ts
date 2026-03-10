import { Channel as PhoenixChannel } from 'phoenix';
import { TenantConfig } from '../entities/TenantConfig';
import { Message } from '../entities/Message';

export interface ChatRepository {
    connect(config: TenantConfig, userId: string): void;
    disconnect(): void;
    joinRoom(roomId: string, onMessage: (msg: any) => void): PhoenixChannel | null;
    sendMessage(roomId: string, messageBody: any): void;
    markAsRead(roomId: string, messageId: string): void;
    getPresences(roomId: string): any[];
    uploadMedia(
        file: { uri: string; name: string; type: string },
        config: TenantConfig
    ): Promise<{ url: string; type: string }>;
    getConversations(
        config: TenantConfig,
        search?: string
    ): Promise<any>;
}
