import React, { useEffect, useState } from 'react';
import { useChatStore, ChatState } from '../../data/datasources/ChatStore';
import { useRevoluchat } from '../RevoluchatProvider';
import { Message } from '../../domain/entities/Message';


/**
 * Hook to subscribe to messages in a specific room.
 */
export const useMessages = (roomId: string) => {
    const { client, userId } = useRevoluchat();
    const messages = useChatStore((state: ChatState) => state.messagesByChannel[roomId] || []);
    const hasMore = useChatStore((state: ChatState) => state.hasMoreByRoom[roomId] ?? true);
    const replyingTo = useChatStore((state: ChatState) => state.replyingTo);
    const setReplyingTo = useChatStore((state: ChatState) => state.setReplyingTo);
    const [typingUsers, setTypingUsers] = useState<string[]>([]);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    useEffect(() => {
        client.joinRoom(roomId);

        // Sync typing users from presence
        const interval = setInterval(() => {
            const presences = client.getPresences(roomId);
            const othersTyping = presences
                .filter(p => p.id !== userId && p.typing === true)
                .map(p => p.name || 'User');

            setTypingUsers(othersTyping);
        }, 1000);

        return () => {
            clearInterval(interval);
            client.leaveRoom(roomId);
            useChatStore.getState().setActiveChannelId(null);
        };
    }, [client, roomId, userId]);

    const loadMore = async (search?: string) => {
        if (isLoadingMore || !hasMore) return;
        setIsLoadingMore(true);
        try {
            await client.loadMoreMessages(roomId, search);
        } finally {
            setIsLoadingMore(false);
        }
    };

    const sendMessage = (text: string) => {
        client.sendMessage(roomId, text, replyingTo?.id);
        setReplyingTo(null);
    };

    const sendAttachments = async (files: { uri: string; name: string; type: string }[], text?: string) => {
        await client.sendAttachments(roomId, files, text, replyingTo?.id);
        setReplyingTo(null);
    };

    const deleteMessage = (messageId: string) => {
        client.deleteMessage(roomId, messageId);
    };

    const sendTypingStatus = (typing: boolean) => {
        client.sendTypingStatus(roomId, typing);
    };

    return {
        messages,
        hasMore,
        isLoadingMore,
        loadMore,
        sendMessage,
        sendAttachments,
        deleteMessage,
        replyingTo,
        setReplyingTo,
        typingUsers,
        sendTypingStatus,
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
    const channels = useChatStore((state: any) => {
        // Auto-arrange: Sort channels by last message timestamp (descending)
        return [...state.channels].sort((a, b) => {
            const timeA = a.lastMessage?.createdAt
                ? new Date(a.lastMessage.createdAt).getTime()
                : new Date(a.updatedAt || a.createdAt).getTime();
            const timeB = b.lastMessage?.createdAt
                ? new Date(b.lastMessage.createdAt).getTime()
                : new Date(b.updatedAt || b.createdAt).getTime();
            return timeB - timeA;
        });
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const refreshChannels = async () => {
        setLoading(true);
        setError(null);
        try {
            console.log('[Revoluchat SDK] refreshChannels started');
            await client.getConversations();
            console.log('[Revoluchat SDK] refreshChannels finished successfully');
        } catch (err: any) {
            console.error('[Revoluchat SDK] refreshChannels failed:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    const connectionStatus = useChatStore((state) => state.connectionStatus);

    useEffect(() => {
        if (client.isInitialized()) {
            refreshChannels();
        } else {
            console.log('[Revoluchat SDK] useChannels: skip refresh, client not initialized yet');
        }
    }, [client, connectionStatus]);

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
export * from './useCallHistory';
