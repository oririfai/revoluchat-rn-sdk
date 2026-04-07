import { useState, useCallback, useEffect } from 'react';
import { DI } from '../../di';

export interface CallHistoryItem {
    id: string;
    direction: 'incoming' | 'outgoing';
    type: 'audio' | 'video';
    status: 'missed' | 'rejected' | 'completed';
    duration_seconds: number;
    started_at: string;
    inserted_at: string;
    conversation_id: string;
    other_party: {
        id: number;
        name: string;
        avatar_url?: string;
        phone?: string;
    };
}

export const useCallHistory = () => {
    const [history, setHistory] = useState<CallHistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const socketClient = DI.socketClient;

    const fetchHistory = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await socketClient.getCallHistory();
            setHistory(data);
        } catch (err: any) {
            console.error('[useCallHistory] Failed to fetch history:', err);
            setError(err.message || 'Failed to fetch call history');
        } finally {
            setIsLoading(false);
        }
    }, [socketClient]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    return {
        history,
        isLoading,
        error,
        refresh: fetchHistory
    };
};
