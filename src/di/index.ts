import { ChatSocketClient } from '../data/datasources/ChatSocketClient';
import { MediaService } from '../data/datasources/MediaService';
import { ChatRepositoryImpl } from '../data/repositories/ChatRepositoryImpl';
import { ChatRepository } from '../domain/repositories/ChatRepository';
import { SendMessageUseCase } from '../domain/usecases/SendMessageUseCase';
import { JoinRoomUseCase } from '../domain/usecases/JoinRoomUseCase';
import { SendAttachmentUseCase } from '../domain/usecases/SendAttachmentUseCase';
import { MarkAsReadUseCase } from '../domain/usecases/MarkAsReadUseCase';
import { GetConversationsUseCase } from '../domain/usecases/GetConversationsUseCase';

/**
 * Simple Dependency Injection Container / Service Locator.
 * This can be replaced with tsyringe or Inversify if decorators complexity is needed.
 */
export class DI {
    private static _socketClient: ChatSocketClient;
    private static _mediaService: MediaService;
    private static _repository: ChatRepository;

    static get socketClient(): ChatSocketClient {
        if (!this._socketClient) this._socketClient = new ChatSocketClient();
        return this._socketClient;
    }

    static get mediaService(): MediaService {
        if (!this._mediaService) this._mediaService = MediaService.getInstance();
        return this._mediaService;
    }

    static get repository(): ChatRepository {
        if (!this._repository) {
            this._repository = new ChatRepositoryImpl(this.socketClient, this.mediaService);
        }
        return this._repository;
    }

    // UseCases
    static inviteSendMessage(): SendMessageUseCase {
        return new SendMessageUseCase(this.repository);
    }

    static inviteJoinRoom(): JoinRoomUseCase {
        return new JoinRoomUseCase(this.repository);
    }

    static inviteSendAttachment(): SendAttachmentUseCase {
        return new SendAttachmentUseCase(this.repository);
    }

    static inviteMarkAsRead(): MarkAsReadUseCase {
        return new MarkAsReadUseCase(this.repository);
    }

    static inviteGetConversations(): GetConversationsUseCase {
        return new GetConversationsUseCase(this.repository);
    }
}
