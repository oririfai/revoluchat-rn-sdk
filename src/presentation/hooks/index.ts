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
    }, [client, roomId]);

    const sendMessage = (text: string) => {
        client.sendMessage(roomId, text);
    };

    return {
        messages,
        sendMessage,
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

    useEffect(() => {
        if (channels.length === 0) {
            client.getConversations();
        }
    }, [client, channels.length]);

    return channels;
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
