import { ChatSocketClient } from '../data/datasources/ChatSocketClient';
import { useChatStore } from '../data/datasources/ChatStore';
import { TenantConfig } from '../domain/entities/TenantConfig';
import { Message } from '../domain/entities/Message';
import { MessageMapper } from '../utils/MessageMapper';
import { DI } from '../di';
import { SendMessageUseCase } from '../domain/usecases/SendMessageUseCase';
import { JoinRoomUseCase } from '../domain/usecases/JoinRoomUseCase';
import { SendAttachmentUseCase } from '../domain/usecases/SendAttachmentUseCase';
import { MarkAsReadUseCase } from '../domain/usecases/MarkAsReadUseCase';
import { GetConversationsUseCase } from '../domain/usecases/GetConversationsUseCase';
import { GetContactsUseCase } from '../domain/usecases/GetContactsUseCase';
import { CreateConversationUseCase } from '../domain/usecases/CreateConversationUseCase';
import { AddContactUseCase } from '../domain/usecases/AddContactUseCase';

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
    private getConversationsUseCase: GetConversationsUseCase;
    private getContactsUseCase: GetContactsUseCase;
    private addContactUseCase: AddContactUseCase;
    private createConversationUseCase: CreateConversationUseCase;

    private constructor() {
        this.socketClient = DI.socketClient;
        this.sendMessageUseCase = DI.inviteSendMessage();
        this.joinRoomUseCase = DI.inviteJoinRoom();
        this.sendAttachmentUseCase = DI.inviteSendAttachment();
        this.markAsReadUseCase = DI.inviteMarkAsRead();
        this.getConversationsUseCase = DI.inviteGetConversations();
        this.getContactsUseCase = DI.inviteGetContacts();
        this.addContactUseCase = DI.inviteAddContact();
        this.createConversationUseCase = DI.inviteCreateConversation();
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
            
            // Fetch dynamic RTC config (STUN/TURN servers) from backend
            this.fetchRTCConfig();

            // CRITICAL FIX: Automatically join global signaling channel
            // This ensures we receive 'call:incoming' and 'call:accepted' signals
            // even when not inside a chat room.
            this.joinUserChannel(userId);
            
        } catch (error) {
            useChatStore.getState().setConnectionStatus('error');
            console.error('[Revoluchat SDK] Initialization failed', error);
        }
    }

    public async fetchRTCConfig(): Promise<void> {
        try {
            const data = await this.socketClient.getRTCConfig();
            if (data && data.ice_servers) {
                console.log('[Revoluchat SDK] Successfully fetched dynamic RTC config');
                useChatStore.getState().setIceServers(data.ice_servers);
            }
        } catch (error) {
            console.warn('[Revoluchat SDK] Failed to fetch dynamic RTC config, using local fallback.', error);
        }
    }

    public async joinRoom(roomId: string): Promise<void> {
        await this.joinRoomUseCase.execute({ roomId, userId: this.userId || undefined });
    }

    public leaveRoom(roomId: string): void {
        this.socketClient.leaveRoom(roomId);
    }

    public joinUserChannel(userId: string): void {
        this.socketClient.joinUserChannel(userId, (payload) => {
            const store = useChatStore.getState();

            // Handle Global Call Events
            if (payload.type === 'call_event') {
                const { event, payload: callData } = payload;
                const activeCall = store.activeCall;

                if (event === 'call:incoming') {
                    // Start an incoming call session
                    store.setActiveCall({
                        id: callData.call_id,
                        type: callData.type,
                        status: 'dialing', // UI will show as 'Incoming' based on callerId
                        conversationId: callData.conversation_id,
                        callerId: callData.caller_id,
                        callerName: callData.caller_name || callData.phone_number || 'Unknown User',
                        callerPhoto: callData.caller_photo,
                        receiverId: userId ? parseInt(userId) : 0,
                        startedAt: new Date(),
                    });
                } else if (activeCall) {
                    // Robust ID comparison: trim and ignore case to handle stringification differences
                    const incomingId = String(callData.call_id || '').trim().toLowerCase();
                    const currentId = String(activeCall.id || '').trim().toLowerCase();
                    const isIdMatch = incomingId === currentId;

                    console.log(`[Revoluchat SDK] Global Signal [${event}]: ${incomingId} (Matching: ${isIdMatch})`);

                    // RADICAL SYNC: If it's call:accepted, we force update if ANY call is active
                    // This ensures callers don't get stuck even if IDs slightly mismatch in string format
                    if (event === 'call:accepted' || isIdMatch) {
                        // Update existing call session status and metadata
                        if (event === 'call:accepted') {
                            console.log('[Revoluchat SDK] FORCE SYNC: Call Accepted');
                            store.setActiveCall({ 
                                ...activeCall, 
                                status: 'connected',
                                callerName: callData.caller_name || activeCall.callerName,
                                receiverName: callData.receiver_name || activeCall.receiverName
                            });
                        } else if (event === 'call:rejected' || event === 'call:hangup') {
                            store.setActiveCall(null);
                        }
                    }
                }
                return;
            }

            if (payload.conversation_id && payload.last_message) {
                const lastMessage = MessageMapper.mapPayloadToMessage(payload.last_message, payload.conversation_id);
                const channel = store.channels.find(c => c.id === payload.conversation_id);
                
                // Only increment unread if we are not the sender AND not currently in this room
                const isSender = lastMessage.sender.id?.toString() === userId?.toString();
                const isActiveRoom = store.activeChannelId === payload.conversation_id;
                const unreadIncrement = (isSender || isActiveRoom) ? 0 : (payload.unread_count_update || 0);

                console.log('[Revoluchat SDK] joinUserChannel update:', {
                    conversation_id: payload.conversation_id,
                    isSender,
                    isActiveRoom,
                    unreadIncrement,
                    currentUnread: channel?.unreadCount
                });

                if (channel) {
                    store.updateChannel({
                        id: payload.conversation_id,
                        lastMessage: lastMessage,
                        unreadCount: (channel.unreadCount || 0) + unreadIncrement,
                        updatedAt: new Date()
                    });
                } else {
                    // New channel, refresh the list
                    console.log('[Revoluchat SDK] New channel via user channel, refreshing list');
                    this.getConversations();
                }
            }
        });
    }

    public async sendMessage(roomId: string, text: string): Promise<void> {
        if (!this.userId) throw new Error('Client not initialized');
        await this.sendMessageUseCase.execute({ roomId, text, userId: this.userId });
    }

    public async sendAttachments(
        roomId: string,
        files: { uri: string; name: string; type: string }[],
        text?: string
    ): Promise<void> {
        if (!this.config || !this.userId) throw new Error('Client not initialized');
        return this.sendAttachmentUseCase.execute({ roomId, files, config: this.config, userId: this.userId, text });
    }

    public async getConversations(search?: string): Promise<any> {
        if (!this.config || !this.userId) throw new Error('Client not initialized');
        const channels = await this.getConversationsUseCase.execute({ config: this.config, currentUserId: this.userId, search });
        useChatStore.getState().setChannels(channels);
        return channels;
    }

    public async getContacts(): Promise<any> {
        if (!this.config) throw new Error('Client not initialized');
        return this.getContactsUseCase.execute({ config: this.config });
    }

    public async addContact(phone: string): Promise<any> {
        if (!this.config) throw new Error('Client not initialized');
        return this.addContactUseCase.execute({ config: this.config, phone });
    }

    public async createConversation(targetUserId: string): Promise<any> {
        if (!this.config || !this.userId) throw new Error('Client not initialized');
        const channel = await this.createConversationUseCase.execute({ config: this.config, currentUserId: this.userId, targetUserId });
        useChatStore.getState().upsertChannel(channel);
        return channel;
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
