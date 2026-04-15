import { useChatStore, ChatState } from '../../data/datasources/ChatStore';
import { useRevoluchat } from '../RevoluchatProvider';
import { Channel } from '../../domain/entities/Channel';
import { User } from '../../domain/entities/User';
import { usePresence } from './index';

/**
 * Hook to get details of a specific channel and its participants.
 * Useful for chat headers.
 */
export const useChannel = (roomId: string) => {
    const { userId: myUserId } = useRevoluchat();
    const channel = useChatStore((state: ChatState) => 
        state.channels.find(c => c.id === roomId)
    );
    const presences = usePresence(roomId);

    if (!channel) return { channel: null, receiver: null, isOnline: false };

    // Identify the other participant in direct chats
    const receiver = channel.type === 'direct' 
        ? channel.members.find(m => m.id?.toString() !== myUserId?.toString()) 
        : null;

    // Check if receiver is online and typing
    const receiverPresence = receiver 
        ? presences.find(p => p.id?.toString() === receiver.id?.toString()) 
        : null;

    const isOnline = !!receiverPresence;
    const isTyping = receiverPresence?.typing === true;

    return {
        channel,
        receiver,
        isOnline,
        isTyping
    };
};
