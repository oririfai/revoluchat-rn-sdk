import { Channel as PhoenixChannel } from 'phoenix';
import { ChatRepository } from '../../domain/repositories/ChatRepository';
import { ChatSocketClient } from '../datasources/ChatSocketClient';
import { MediaService } from '../datasources/MediaService';
import { TenantConfig } from '../../domain/entities/TenantConfig';
import { ChannelMapper } from '../../utils/ChannelMapper';

export class ChatRepositoryImpl implements ChatRepository {
    constructor(
        private socketClient: ChatSocketClient,
        private mediaService: MediaService
    ) { }

    connect(config: TenantConfig, userId: string): void {
        this.socketClient.connect(config, userId);
    }

    disconnect(): void {
        this.socketClient.disconnect();
    }

    joinRoom(roomId: string, onMessage: (msg: any) => void, onReadReceipt?: (payload: any) => void): Promise<{ channel: PhoenixChannel; messages: any[] }> {
        return this.socketClient.joinRoom(roomId, onMessage, undefined, onReadReceipt);
    }

    leaveRoom(roomId: string): void {
        this.socketClient.leaveRoom(roomId);
    }

    async sendMessage(roomId: string, messageBody: any): Promise<void> {
        await this.socketClient.sendMessage(roomId, messageBody);
    }

    markAsRead(roomId: string, messageId: string): void {
        this.socketClient.markAsRead(roomId, messageId);
    }

    getPresences(roomId: string): any[] {
        return this.socketClient.getPresences(roomId);
    }

    async uploadMedia(
        file: { uri: string; name: string; type: string },
        config: TenantConfig
    ): Promise<{ url: string; type: string }> {
        return this.mediaService.upload(
            `${config.baseUrl}/uploads`,
            file,
            config.authToken || '',
            config.apiKey
        );
    }

    async uploadMediaToUrl(
        url: string,
        file: { uri: string; name: string; type: string },
        method?: string,
        params?: Record<string, any>
    ): Promise<void> {
        return this.mediaService.uploadToUrl(url, file, method, params);
    }

    async initAttachment(params: {
        filename: string;
        mime_type: string;
        size: number;
        app_id: string;
    }, config: TenantConfig): Promise<{ 
        id: string; 
        upload_url: string;
        upload_method?: string;
        upload_params?: Record<string, any>;
    }> {
        const url = `${config.baseUrl}/api/v1/attachments/init`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.authToken}`,
                'X-API-KEY': config.apiKey,
                'x-tenant-id': config.tenantId,
                'x-app-id': config.appId
            },
            body: JSON.stringify(params)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Init attachment failed: ${response.statusText} - ${errorText}`);
        }

        const json = await response.json();
        // Backend wraps response in a "data" object
        const data = json.data || json;
        
        return {
            id: data.id,
            upload_url: data.upload_url,
            upload_method: data.upload_method,
            upload_params: data.upload_params
        };
    }

    async confirmAttachment(id: string, config: TenantConfig): Promise<void> {
        const url = `${config.baseUrl}/api/v1/attachments/${id}/confirm`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.authToken}`,
                'X-API-KEY': config.apiKey,
                'x-tenant-id': config.tenantId,
                'x-app-id': config.appId
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Confirm attachment failed: ${response.statusText} - ${errorText}`);
        }
    }

    async getConversations(
        config: TenantConfig,
        currentUserId: string,
        search?: string
    ): Promise<any> {
        let url = `${config.baseUrl}/api/v1/conversations`;
        const params = new URLSearchParams();
        if (search) {
            params.append('search', search);
        }
        
        if (params.toString()) {
            url += `?${params.toString()}`;
        }

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${config.authToken}`,
                'X-API-KEY': config.apiKey,
                'x-tenant-id': config.tenantId,
                'x-app-id': config.appId
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`getConversations failed: ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        const conversations = data.conversations || [];
        return conversations.map((c: any) => ChannelMapper.mapPayloadToChannel(c));
    }

    async getContacts(
        config: TenantConfig
    ): Promise<any> {
        const url = `${config.baseUrl}/api/v1/contacts`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${config.authToken}`,
                'X-API-KEY': config.apiKey,
                'x-tenant-id': config.tenantId,
                'x-app-id': config.appId
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`getContacts failed: ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        const contacts = data.contacts || [];
        return contacts.map((u: any) => ChannelMapper.mapPayloadToUser(u));
    }

    async addContact(
        config: TenantConfig,
        phone: string
    ): Promise<any> {
        const url = `${config.baseUrl}/api/v1/contacts`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.authToken}`,
                'X-API-KEY': config.apiKey,
                'x-tenant-id': config.tenantId,
                'x-app-id': config.appId
            },
            body: JSON.stringify({ phone })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Failed to add contact: ${response.statusText}`);
        }

        return await response.json();
    }

    async createConversation(
        config: TenantConfig,
        currentUserId: string,
        targetUserId: string
    ): Promise<any> {
        const url = `${config.baseUrl}/api/v1/conversations`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.authToken}`,
                'X-API-KEY': config.apiKey,
                'x-tenant-id': config.tenantId,
                'x-app-id': config.appId
            },
            body: JSON.stringify({ user_id: targetUserId })
        });

        if (!response.ok) {
            throw new Error(`Failed to create conversation: ${response.statusText}`);
        }

        const data = await response.json();
        // Backend returns { conversation: { ... } }
        return ChannelMapper.mapPayloadToChannel(data.conversation || data);
    }
}
