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

    joinRoom(roomId: string, onMessage: (msg: any) => void): PhoenixChannel {
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
            config.authToken || ''
        );
    }
}
