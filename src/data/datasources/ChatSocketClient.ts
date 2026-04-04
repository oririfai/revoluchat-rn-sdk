import { Socket, Channel, Presence } from 'phoenix';
import { TenantConfig } from '../../domain/entities/TenantConfig';
import { isTokenExpired, msUntilTokenExpiry } from '../../utils/jwtUtils';

export class ChatSocketClient {
    private socket: Socket | null = null;
    private roomChannels: Map<string, Channel> = new Map();
    private presences: Map<string, any> = new Map();
    private appId: string | null = null;
    private pendingJoins: Set<{ roomId: string; onMessage: (msg: any) => void; onCall?: (event: string, payload: any) => void; onReadReceipt?: (payload: any) => void; resolve: (data: { channel: Channel; messages: any[] }) => void; reject: (err: any) => void }> = new Set();
    private joiningPromises: Map<string, Promise<{ channel: Channel; messages: any[] }>> = new Map();
    private userChannel: Channel | null = null;
    private userChannelUserId: string | null = null;
    private userChannelCallback: ((data: any) => void) | null = null;
    private roomCallbacks: Map<string, { 
        onMessage: (msg: any) => void; 
        onCall?: (event: string, payload: any) => void; 
        onReadReceipt?: (payload: any) => void 
    }> = new Map();

    // Token lifecycle management
    private currentConfig: TenantConfig | null = null;
    private currentUserId: string | null = null;
    private currentToken: string | null = null;
    private tokenRefreshTimer: ReturnType<typeof setTimeout> | null = null;

    public isConnected: boolean = false;


    public connect(config: TenantConfig, userId: string): void {
        // Idempotency check: don't reconnect if nothing changed
        if (this.socket && 
            this.isConnected &&
            this.currentConfig &&
            this.currentConfig.socketUrl === config.socketUrl &&
            this.currentConfig.tenantId === config.tenantId &&
            this.currentConfig.appId === config.appId &&
            this.currentConfig.authToken === config.authToken &&
            this.currentConfig.apiKey === config.apiKey &&
            this.currentUserId === userId) {
            console.log('[Revoluchat SDK] Already connected with same config. Skipping reconnect.');
            return;
        }

        if (this.socket) {
            console.log('[Revoluchat SDK] Config changed or socket stale. Reconnecting...');
            this.socket.disconnect();
            this.socket = null;
        }

        // Guard: check if token is already expired before even connecting
        if (config.authToken && isTokenExpired(config.authToken)) {
            console.warn('[Revoluchat SDK] Token is already expired before connect.');
            config.onSessionExpired?.();
            return;
        }

        this.currentConfig = config;
        this.currentUserId = userId;
        this.currentToken = config.authToken ?? null;

        // Schedule token refresh
        this._scheduleTokenRefresh(config);

        const params = {
            tenant_id: config.tenantId,
            app_id: config.appId,
            token: config.authToken,
            api_key: config.apiKey,
            user_id: userId,
        };

        this.appId = config.appId;

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

            // Process pending joins
            this.pendingJoins.forEach(join => {
                console.log(`[Revoluchat SDK] Processing pending join for room ${join.roomId}`);
                // Since we are now connected, calling joinRoom will trigger initiateJoin
                // We need to temporarily remove the promise from joiningPromises so it doesn't just return it
                this.joiningPromises.delete(join.roomId);
                this.joinRoom(join.roomId, join.onMessage, join.onCall, join.onReadReceipt)
                    .then(join.resolve)
                    .catch(join.reject);
            });
            // Join user channel if requested
            if (this.userChannelUserId && this.userChannelCallback) {
                this.joinUserChannel(this.userChannelUserId, this.userChannelCallback);
            }

            this.pendingJoins.clear();
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

    /** Schedule an automatic token refresh before the token expires. */
    private _scheduleTokenRefresh(config: TenantConfig): void {
        if (this.tokenRefreshTimer) {
            clearTimeout(this.tokenRefreshTimer);
            this.tokenRefreshTimer = null;
        }

        if (!config.authToken || !config.onTokenRefresh) return;

        const msUntilRefresh = msUntilTokenExpiry(config.authToken, 60);
        console.log(`[Revoluchat SDK] Token refresh scheduled in ${Math.round(msUntilRefresh / 1000)}s`);

        if (msUntilRefresh <= 0) {
            // Already within the buffer window — refresh immediately
            this._handleTokenRefresh();
            return;
        }

        this.tokenRefreshTimer = setTimeout(() => {
            this._handleTokenRefresh();
        }, msUntilRefresh);
    }

    /** Called when the token is about to expire. Fetches a new token and reconnects.*/
    private async _handleTokenRefresh(): Promise<void> {
        const config = this.currentConfig;
        const userId = this.currentUserId;

        if (!config || !userId) return;

        if (!config.onTokenRefresh) {
            console.warn('[Revoluchat SDK] Token expired and no onTokenRefresh handler provided. Disconnecting.');
            this.disconnect();
            config.onSessionExpired?.();
            return;
        }

        try {
            console.log('[Revoluchat SDK] Refreshing token...');
            const newToken = await config.onTokenRefresh();

            // Store the new token
            this.currentToken = newToken;
            const updatedConfig: TenantConfig = { ...config, authToken: newToken };
            this.currentConfig = updatedConfig;

            console.log('[Revoluchat SDK] Token refreshed. Reconnecting socket...');

            // Preserve existing room channels and reconnect
            const existingRooms = Array.from(this.roomChannels.keys());
            this.roomChannels.clear();

            // Re-connect with the new token
            this.connect(updatedConfig, userId);

            // Re-join all rooms after a short delay for socket to connect
            setTimeout(() => {
                existingRooms.forEach(roomId => {
                    // Re-join with empty callbacks since actual listeners
                    // are owned by presentation layer and will reattach on their own
                    this.joinRoom(roomId, () => {});
                });
            }, 500);
        } catch (err) {
            console.error('[Revoluchat SDK] Token refresh failed:', err);
            this.disconnect();
            config.onSessionExpired?.();
        }
    }
    public joinRoom(roomId: string, onMessage: (msg: any) => void, onCall?: (event: string, payload: any) => void, onReadReceipt?: (payload: any) => void): Promise<{ channel: Channel; messages: any[] }> {
        // ALWAYS update the callbacks for this room, even if already joined
        this.roomCallbacks.set(roomId, { onMessage, onCall, onReadReceipt });

        // If already joined, return resolved promise
        if (this.roomChannels.has(roomId)) {
            return Promise.resolve({ channel: this.roomChannels.get(roomId)!, messages: [] });
        }

        // If already in progress, return the existing promise
        if (this.joiningPromises.has(roomId)) {
            return this.joiningPromises.get(roomId)!;
        }

        const joinPromise = new Promise<{ channel: Channel; messages: any[] }>((resolve, reject) => {
            const initiateJoin = () => {
                if (!this.socket || !this.isConnected) {
                    reject(new Error('Socket not connected during join attempt'));
                    return;
                }

                const topic = `tenant:${this.appId}:room:${roomId}`;
                const roomChannel = this.socket.channel(topic, {});

                roomChannel.join()
                    .receive('ok', resp => {
                        console.log(`[Revoluchat SDK] Joined room ${roomId} successfully`, resp);
                        this.roomChannels.set(roomId, roomChannel);
                        this.joiningPromises.delete(roomId);
                        resolve({ channel: roomChannel, messages: resp.messages || [] });
                    })
                    .receive('error', resp => {
                        console.error(`[Revoluchat SDK] Unable to join room ${roomId}`, resp);
                        this.joiningPromises.delete(roomId);
                        reject(resp);
                    })
                    .receive('timeout', () => {
                        console.error(`[Revoluchat SDK] Join room ${roomId} timed out`);
                        this.joiningPromises.delete(roomId);
                        reject(new Error('Join timeout'));
                    });

                roomChannel.on('presence_state', state => {
                    this.presences.set(roomId, Presence.syncState(this.presences.get(roomId) || {}, state));
                });

                roomChannel.on('presence_diff', diff => {
                    this.presences.set(roomId, Presence.syncDiff(this.presences.get(roomId) || {}, diff));
                });

                roomChannel.on('new_message', payload => {
                    const callbacks = this.roomCallbacks.get(roomId);
                    if (callbacks) callbacks.onMessage(payload);
                });
 
                 // --- RTC SIGNALING EVENTS ---
                 const callEvents = [
                     'call:incoming',
                     'call:ringing',
                     'call:accepted',
                     'call:rejected',
                     'call:signal',
                     'call:hangup'
                 ];
 
                 callEvents.forEach(event => {
                     roomChannel.on(event, (payload) => {
                        const callbacks = this.roomCallbacks.get(roomId);
                        if (callbacks && callbacks.onCall) callbacks.onCall(event, payload);
                     });
                 });
 
                roomChannel.on('message_read', payload => {
                    const callbacks = this.roomCallbacks.get(roomId);
                    if (callbacks && callbacks.onReadReceipt) {
                        // Ensure ID is string for store comparison
                        const receipt = {
                            ...payload,
                            message_id: payload.message_id?.toString()
                        };
                        callbacks.onReadReceipt(receipt);
                    }
                });
            };

            if (!this.socket || !this.isConnected) {
                console.log(`[Revoluchat SDK] Socket not ready. Queueing join for room ${roomId}`);
                this.pendingJoins.add({ roomId, onMessage, onCall, onReadReceipt, resolve, reject });
            } else {
                initiateJoin();
            }
        });

        this.joiningPromises.set(roomId, joinPromise);
        return joinPromise;
    }

    public leaveRoom(roomId: string): void {
        const channel = this.roomChannels.get(roomId);
        if (channel) {
            channel.leave();
            this.roomChannels.delete(roomId);
            this.roomCallbacks.delete(roomId);
            this.joiningPromises.delete(roomId);
            console.log(`[Revoluchat SDK] Left room ${roomId}`);
        }
    }

    public async sendMessage(roomId: string, messageBody: any): Promise<void> {
        let channel = this.roomChannels.get(roomId);

        if (!channel) {
            // Check if we are currently joining
            if (this.joiningPromises.has(roomId)) {
                console.log(`[Revoluchat SDK] sendMessage called while joining room ${roomId}. Waiting...`);
                const data = await this.joiningPromises.get(roomId);
                channel = data?.channel;
            } else {
                // Not joining, not joined. Throw error since we now require join before entering chat.
                console.error(`[Revoluchat SDK] Cannot send message, not joined to room ${roomId}`);
                throw new Error(`Not joined to room ${roomId}`);
            }
        }

        if (!channel) {
            throw new Error(`Could not get channel for room ${roomId}`);
        }

        channel.push('new_message', messageBody)
            .receive('ok', () => console.log('Message sent'))
            .receive('error', (reasons) => console.error('Message failed', reasons))
            .receive('timeout', () => console.error('Networking issue...'));
    }

    public markAsRead(roomId: string, messageId: string): void {
        const channel = this.roomChannels.get(roomId);
        if (channel) {
            channel.push('mark_read', { message_id: messageId });
        }
    }

    public sendCallSignal(roomId: string, event: string, payload: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const channel = this.roomChannels.get(roomId);
            if (!channel) {
                reject(new Error(`Not joined to room ${roomId}`));
                return;
            }

            channel.push(event, payload)
                .receive('ok', (resp) => resolve(resp))
                .receive('error', (reasons) => reject(reasons))
                .receive('timeout', () => reject(new Error('Signaling timeout')));
        });
    }


    public getPresences(roomId: string): any[] {
        const presence = this.presences.get(roomId) || {};
        return Presence.list(presence, (id, { metas: [first, ..._rest] }) => {
            return { ...first, id: id?.toString() };
        });
    }

    public joinUserChannel(userId: string, onUpdate: (data: any) => void): void {
        this.userChannelUserId = userId;
        this.userChannelCallback = onUpdate;

        if (!this.socket || !this.isConnected) {
            console.log('[Revoluchat SDK] User channel join queued (socket not connected)');
            return;
        }

        const topic = `user:${userId}`;
        
        // If already joined the same topic, don't rejoin but update callback if needed
        if (this.userChannel && this.userChannel.topic === topic) {
            console.log(`[Revoluchat SDK] Already joined user channel: ${topic}`);
            return;
        }

        if (this.userChannel) {
            this.userChannel.leave();
        }

        this.userChannel = this.socket.channel(topic, {});

        this.userChannel.join()
            .receive('ok', () => console.log(`[Revoluchat SDK] Joined user channel: ${topic}`))
            .receive('error', (err) => {
                console.error(`[Revoluchat SDK] Failed to join user channel: ${topic}`, err);
                // retry after delay if needed or handle auth error
            });

        this.userChannel.on('conversation_updated', (payload) => {
            console.log('[Revoluchat SDK] Conversation update received:', payload);
            onUpdate(payload);
        });
    }

    public disconnect(): void {
        if (this.tokenRefreshTimer) {
            clearTimeout(this.tokenRefreshTimer);
            this.tokenRefreshTimer = null;
        }
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.isConnected = false;
    }
}
