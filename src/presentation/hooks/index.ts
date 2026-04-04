import React, { useEffect, useState } from 'react';
import { useChatStore, ChatState } from '../../data/datasources/ChatStore';
import { useRevoluchat } from '../RevoluchatProvider';


/**
 * Hook to subscribe to messages in a specific room.
 */
export const useMessages = (roomId: string) => {
    const { client } = useRevoluchat();
    const messages = useChatStore((state: ChatState) => state.messagesByChannel[roomId] || []);

    useEffect(() => {
        client.joinRoom(roomId);
        return () => {
            client.leaveRoom(roomId);
            useChatStore.getState().setActiveChannelId(null);
        };
    }, [client, roomId]);

    const sendMessage = (text: string) => {
        client.sendMessage(roomId, text);
    };

    const sendAttachments = (files: { uri: string; name: string; type: string }[], text?: string) => {
        client.sendAttachments(roomId, files, text);
    };

    return {
        messages,
        sendMessage,
        sendAttachments,
    };
};

/**
 * Hook to get connection status.
 */
export const useConnectionStatus = () => {
    return useChatStore((state: any) => state.connectionStatus);
};

/**
 * Hook to get the list of channels.
 */
export const useChannels = () => {
    const { client } = useRevoluchat();
    const channels = useChatStore((state: any) => state.channels);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const refreshChannels = async () => {
        setLoading(true);
        setError(null);
        try {
            await client.getConversations();
        } catch (err: any) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshChannels();
    }, [client]);

    return { channels, loading, error, refreshChannels };
};


/**
 * Hook to get online users in a room.
 */
export const usePresence = (roomId: string) => {
    const { client } = useRevoluchat();
    const [presences, setPresences] = useState<any[]>([]);

    useEffect(() => {
        const interval = setInterval(() => {
            const list = client.getPresences(roomId);
            setPresences(list);
        }, 1000); // Poll presence every second

        return () => clearInterval(interval);
    }, [client, roomId]);

    return presences;
};

export * from './useCallControls';
export * from './useChannel';
