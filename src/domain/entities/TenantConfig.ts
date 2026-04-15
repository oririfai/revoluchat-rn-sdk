export interface TenantConfig {
    tenantId: string;
    appId: string;
    baseUrl: string;
    socketUrl: string;
    apiKey: string;
    authToken?: string;
    tier?: 'basic' | 'standard' | 'pro';
    heartbeatIntervalMs?: number;
    reconnectAfterMs?: (tries: number) => number;

    /**
     * Called when the auth token is about to expire (60s before expiry by default).
     * Return the new JWT token string to seamlessly reconnect the socket.
     * If not provided or an error is thrown, the socket will just disconnect.
     */
    onTokenRefresh?: () => Promise<string>;

    /**
     * Called after a failed token refresh or when the socket is definitively disconnected
     * due to token expiry without a refresh handler. Use this to redirect to login.
     */
    onSessionExpired?: () => void;
}
