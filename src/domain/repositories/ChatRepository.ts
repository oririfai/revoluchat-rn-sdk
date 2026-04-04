import { Channel as PhoenixChannel } from 'phoenix';
import { TenantConfig } from '../entities/TenantConfig';
import { Message } from '../entities/Message';
import { Channel } from '../entities/Channel';
import { User } from '../entities/User';

export interface ChatRepository {
    connect(config: TenantConfig, userId: string): void;
    disconnect(): void;
    joinRoom(roomId: string, onMessage: (msg: any) => void, onReadReceipt?: (payload: any) => void): Promise<{ channel: PhoenixChannel; messages: any[] }>;
    leaveRoom(roomId: string): void;
    sendMessage(roomId: string, messageBody: any): Promise<void>;
    markAsRead(roomId: string, messageId: string): void;
    getPresences(roomId: string): any[];
    uploadMedia(
        file: { uri: string; name: string; type: string },
        config: TenantConfig
    ): Promise<{ url: string; type: string }>;
    uploadMediaToUrl(
        url: string,
        file: { uri: string; name: string; type: string },
        method?: string,
        params?: Record<string, any>
    ): Promise<void>;
    initAttachment(params: {
        filename: string;
        mime_type: string;
        size: number;
        app_id: string;
    }, config: TenantConfig): Promise<{ 
        id: string; 
        upload_url: string;
        upload_method?: string;
        upload_params?: Record<string, any>;
    }>;
    confirmAttachment(id: string, config: TenantConfig): Promise<void>;
    getConversations(config: TenantConfig, currentUserId: string, search?: string): Promise<Channel[]>;
    getContacts(config: TenantConfig): Promise<User[]>;
    addContact(config: TenantConfig, phone: string): Promise<any>;
    createConversation(config: TenantConfig, currentUserId: string, targetUserId: string): Promise<Channel>;
}
