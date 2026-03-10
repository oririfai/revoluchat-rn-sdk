export type CallStatus = 'dialing' | 'ringing' | 'connected' | 'completed' | 'missed' | 'rejected';
export type CallType = 'audio' | 'video';

export interface CallSession {
    id: string;
    type: CallType;
    status: CallStatus;
    conversationId: string;
    callerId: number;
    receiverId: number;
    callerName?: string;
    callerPhoto?: string;
    phoneNumber?: string;
    startedAt?: Date;
    endedAt?: Date;
    durationSeconds?: number;
}
