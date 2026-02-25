export interface TenantConfig {
    tenantId: string;
    appId: string;
    baseUrl: string;
    socketUrl: string;
    authToken?: string;
    heartbeatIntervalMs?: number;
    reconnectAfterMs?: (tries: number) => number;
}
