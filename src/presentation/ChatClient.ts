import { ChatSocketClient } from '../data/datasources/ChatSocketClient';
import { useChatStore } from '../data/datasources/ChatStore';
import { TenantConfig } from '../domain/entities/TenantConfig';
import { DI } from '../di';
import { SendMessageUseCase } from '../domain/usecases/SendMessageUseCase';
import { JoinRoomUseCase } from '../domain/usecases/JoinRoomUseCase';
import { SendAttachmentUseCase } from '../domain/usecases/SendAttachmentUseCase';
import { MarkAsReadUseCase } from '../domain/usecases/MarkAsReadUseCase';

export class ChatClient {
    private static instance: ChatClient;
    private socketClient: ChatSocketClient;
    private config: TenantConfig | null = null;
    private userId: string | null = null;

    // UseCases
    private sendMessageUseCase: SendMessageUseCase;
    private joinRoomUseCase: JoinRoomUseCase;
    private sendAttachmentUseCase: SendAttachmentUseCase;
    private markAsReadUseCase: MarkAsReadUseCase;

    private constructor() {
        this.socketClient = DI.socketClient;
        this.sendMessageUseCase = DI.inviteSendMessage();
        this.joinRoomUseCase = DI.inviteJoinRoom();
        this.sendAttachmentUseCase = DI.inviteSendAttachment();
        this.markAsReadUseCase = DI.inviteMarkAsRead();
    }


    public static getInstance(): ChatClient {
        if (!ChatClient.instance) {
            ChatClient.instance = new ChatClient();
        }
        return ChatClient.instance;
    }

    public initialize(config: TenantConfig, userId: string): void {
        this.config = config;
        this.userId = userId;
        useChatStore.getState().setConnectionStatus('connecting');

        try {
            this.socketClient.connect(config, userId);
        } catch (error) {
            useChatStore.getState().setConnectionStatus('error');
            console.error('[Revoluchat SDK] Initialization failed', error);
        }
    }

    public joinRoom(roomId: string): void {
        this.joinRoomUseCase.execute({ roomId });
    }

    public sendMessage(roomId: string, text: string): void {
        if (!this.userId) throw new Error('Client not initialized');
        this.sendMessageUseCase.execute({ roomId, text, userId: this.userId });
    }

    public async sendAttachment(
        roomId: string,
        file: { uri: string; name: string; type: string }
    ): Promise<void> {
        if (!this.config || !this.userId) throw new Error('Client not initialized');
        return this.sendAttachmentUseCase.execute({ roomId, file, config: this.config, userId: this.userId });
    }

    public getPresences(roomId: string): any[] {
        return this.socketClient.getPresences(roomId);
    }

    public markAsRead(roomId: string, messageId: string): void {
        this.markAsReadUseCase.execute({ roomId, messageId });
    }

    public disconnect(): void {
        this.socketClient.disconnect();
        useChatStore.getState().setConnectionStatus('disconnected');
    }
}

