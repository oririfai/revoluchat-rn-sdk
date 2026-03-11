import { Channel as PhoenixChannel } from 'phoenix';
import { ChatRepository } from '../../domain/repositories/ChatRepository';
import { ChatSocketClient } from '../datasources/ChatSocketClient';
import { MediaService } from '../datasources/MediaService';
import { TenantConfig } from '../../domain/entities/TenantConfig';

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

    joinRoom(roomId: string, onMessage: (msg: any) => void): PhoenixChannel | null {
        return this.socketClient.joinRoom(roomId, onMessage);
    }

    sendMessage(roomId: string, messageBody: any): void {
        this.socketClient.sendMessage(roomId, messageBody);
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

    async getConversations(
        config: TenantConfig,
        search?: string
    ): Promise<any> {
        let url = `${config.baseUrl}/api/v1/conversations`;
        if (search) {
            url += `?search=${encodeURIComponent(search)}`;
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
            throw new Error(`Failed to fetch conversations: ${response.statusText}`);
        }

        return await response.json();
    }
}
