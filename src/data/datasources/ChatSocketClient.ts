import { Socket, Channel, Presence } from 'phoenix';
import { TenantConfig } from '../../domain/entities/TenantConfig';

export class ChatSocketClient {
    private socket: Socket | null = null;
    private roomChannels: Map<string, Channel> = new Map();
    private presences: Map<string, any> = new Map();

    public isConnected: boolean = false;


    public connect(config: TenantConfig, userId: string): void {
        if (this.socket) {
            this.socket.disconnect();
        }

        const params = {
            tenant_id: config.tenantId,
            app_id: config.appId,
            token: config.authToken,
            user_id: userId,
        };

        // Initialize Phoenix socket
        this.socket = new Socket(config.socketUrl, {
            params,
            heartbeatIntervalMs: config.heartbeatIntervalMs || 30000,
            reconnectAfterMs: config.reconnectAfterMs || ((tries: number) => {
                return [1000, 2000, 5000, 10000][tries - 1] || 10000;
            })
        });

        this.socket.onOpen(() => {
            this.isConnected = true;
            console.log(`[Revoluchat SDK] Socket connected for tenant ${config.tenantId}`);
        });

        this.socket.onClose(() => {
            this.isConnected = false;
            console.log(`[Revoluchat SDK] Socket disconnected`);
        });

        this.socket.onError((error) => {
            console.error(`[Revoluchat SDK] Socket error`, error);
        });

        this.socket.connect();
    }

    public joinRoom(roomId: string, onMessage: (msg: any) => void): Channel {
        if (!this.socket) {
            throw new Error('Socket not connected');
        }

        if (this.roomChannels.has(roomId)) {
            return this.roomChannels.get(roomId)!;
        }

        const roomChannel = this.socket.channel(`room:${roomId}`, {});

        roomChannel.join()
            .receive('ok', resp => {
                console.log(`Joined room ${roomId} successfully`, resp);
            })
            .receive('error', resp => {
                console.error(`Unable to join room ${roomId}`, resp);
            });

        roomChannel.on('presence_state', state => {
            this.presences.set(roomId, Presence.syncState(this.presences.get(roomId) || {}, state));
        });

        roomChannel.on('presence_diff', diff => {
            this.presences.set(roomId, Presence.syncDiff(this.presences.get(roomId) || {}, diff));
        });

        roomChannel.on('new_message', payload => {
            onMessage(payload);
        });

        roomChannel.on('read_receipt', payload => {
            // This is handled by store directly or via callback
            // For now we assume the store is updated via a broad broadcast
        });

        this.roomChannels.set(roomId, roomChannel);
        return roomChannel;
    }

    public sendMessage(roomId: string, messageBody: any): void {
        const channel = this.roomChannels.get(roomId);
        if (!channel) {
            console.error(`Cannot send message, not joined to room ${roomId}`);
            return;
        }

        channel.push('new_message', messageBody)
            .receive('ok', () => console.log('Message sent'))
            .receive('error', (reasons) => console.error('Message failed', reasons))
            .receive('timeout', () => console.error('Networking issue...'));
    }

    public markAsRead(roomId: string, messageId: string): void {
        const channel = this.roomChannels.get(roomId);
        if (channel) {
            channel.push('message_read', { message_id: messageId });
        }
    }


    public getPresences(roomId: string): any[] {
        const presence = this.presences.get(roomId) || {};
        return Presence.list(presence, (_id, { metas: [first, ..._rest] }) => {
            return first;
        });
    }

    public disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }
}
