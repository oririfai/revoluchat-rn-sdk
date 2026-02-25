import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';
import { Channel } from '../../domain/entities/Channel';
import { Message } from '../../domain/entities/Message';

const storage = new MMKV();

const mmkvStorage = {
    setItem: (name: string, value: string) => storage.set(name, value),
    getItem: (name: string) => storage.getString(name) ?? null,
    removeItem: (name: string) => storage.delete(name),
};


export interface ChatState {
    channels: Channel[];
    messagesByChannel: Record<string, Message[]>;
    connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';

    setChannels: (channels: Channel[]) => void;
    updateChannel: (channel: Partial<Channel> & { id: string }) => void;
    addMessage: (channelId: string, message: Message) => void;
    updateMessageStatus: (channelId: string, messageId: string, status: Message['status']) => void;
    setConnectionStatus: (status: ChatState['connectionStatus']) => void;
}


export const useChatStore = create<ChatState>()(
    persist(
        (set) => ({
            channels: [],
            messagesByChannel: {},
            connectionStatus: 'disconnected',

            setChannels: (channels) => set({ channels }),

            updateChannel: (updatedChannel) => set((state) => ({
                channels: state.channels.map((ch) =>
                    ch.id === updatedChannel.id ? { ...ch, ...updatedChannel } : ch
                ),
            })),

            addMessage: (channelId, message) => set((state) => {
                const currentMessages = state.messagesByChannel[channelId] || [];
                return {
                    messagesByChannel: {
                        ...state.messagesByChannel,
                        [channelId]: [...currentMessages, message],
                    },
                    // Also update the channel's last message
                    channels: state.channels.map((ch) =>
                        ch.id === channelId ? { ...ch, lastMessage: message, updatedAt: new Date() } : ch
                    ),
                };
            }),

            setConnectionStatus: (status) => set({ connectionStatus: status }),

            updateMessageStatus: (channelId, messageId, status) => set((state) => {
                const messages = state.messagesByChannel[channelId] || [];
                return {
                    messagesByChannel: {
                        ...state.messagesByChannel,
                        [channelId]: messages.map(m => m.id === messageId ? { ...m, status } : m),
                    }
                };
            }),
        }),
        {
            name: 'revoluchat-storage',
            storage: createJSONStorage(() => mmkvStorage),
            partialize: (state) => ({
                channels: state.channels,
                messagesByChannel: state.messagesByChannel,
            }),
        }
    )
);
