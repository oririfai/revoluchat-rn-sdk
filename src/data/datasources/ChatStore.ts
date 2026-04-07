import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';
import { Channel } from '../../domain/entities/Channel';
import { Message } from '../../domain/entities/Message';
import { CallSession } from '../../domain/entities/Call';

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
    activeCall: CallSession | null;
    activeChannelId: string | null;
    iceServers: Array<{ urls: string | string[]; username?: string; credential?: string }>;

    setChannels: (channels: Channel[]) => void;
    upsertChannel: (channel: Channel) => void;
    updateChannel: (channel: Partial<Channel> & { id: string }) => void;
    addMessage: (channelId: string, message: Message) => void;
    setMessages: (channelId: string, messages: Message[]) => void;
    updateMessageStatus: (channelId: string, messageId: string, status: Message['status']) => void;
    setConnectionStatus: (status: ChatState['connectionStatus']) => void;
    setActiveCall: (call: CallSession | null | ((prev: CallSession | null) => CallSession | null)) => void;
    setActiveChannelId: (id: string | null) => void;
    resetUnreadCount: (channelId: string) => void;
    setIceServers: (servers: Array<{ urls: string | string[]; username?: string; credential?: string }>) => void;
}


export const useChatStore = create<ChatState>()(
    persist(
        (set) => ({
            channels: [],
            messagesByChannel: {},
            connectionStatus: 'disconnected',
            activeCall: null,
            activeChannelId: null,

            setChannels: (channels) => set({ channels }),
            
            upsertChannel: (channel) => set((state) => {
                const index = state.channels.findIndex((c) => c.id === channel.id);
                if (index !== -1) {
                    return {
                        channels: state.channels.map((c) =>
                            c.id === channel.id ? { ...c, ...channel } : c
                        ),
                    };
                } else {
                    return {
                        channels: [channel, ...state.channels],
                    };
                }
            }),

            updateChannel: (channelUpdate) => set((state) => ({
                channels: state.channels.map(c => 
                    c.id === channelUpdate.id ? { ...c, ...channelUpdate } : c
                )
            })),

            addMessage: (channelId, message) => set((state) => {
                const channelMessages = state.messagesByChannel[channelId] || [];
                // Prevent duplicate messages
                if (channelMessages.find(m => m.id === message.id)) {
                    return state;
                }
                
                // Update messages
                const nextMessages = [...channelMessages, message];
                
                // Update the channel's last message in the list
                const nextChannels = state.channels.map((ch) =>
                    ch.id === channelId 
                        ? { 
                            ...ch, 
                            lastMessage: message, 
                            unreadCount: state.activeChannelId === channelId ? 0 : ch.unreadCount,
                            updatedAt: new Date() 
                          } 
                        : ch
                );

                return {
                    messagesByChannel: {
                        ...state.messagesByChannel,
                        [channelId]: nextMessages
                    },
                    channels: nextChannels
                };
            }),

            setMessages: (channelId, messages) => set((state) => {
                const lastMessage = messages.length > 0 ? messages[messages.length - 1] : undefined;
                return {
                    messagesByChannel: {
                        ...state.messagesByChannel,
                        [channelId]: messages
                    },
                    channels: lastMessage 
                        ? state.channels.map(ch => ch.id === channelId ? { ...ch, lastMessage } : ch)
                        : state.channels
                };
            }),

            setConnectionStatus: (status) => set({ connectionStatus: status }),

            setActiveCall: (call) => set((state) => ({ 
                activeCall: typeof call === 'function' ? call(state.activeCall) : call 
            })),

            setActiveChannelId: (id) => set({ activeChannelId: id }),

            updateMessageStatus: (channelId, messageId, status) => set((state) => {
                const messages = state.messagesByChannel[channelId] || [];
                return {
                    messagesByChannel: {
                        ...state.messagesByChannel,
                        [channelId]: messages.map(m => m.id === messageId ? { ...m, status } : m),
                    }
                };
            }),
            
            resetUnreadCount: (channelId) => set((state) => ({
                channels: state.channels.map((c) =>
                    c.id === channelId ? { ...c, unreadCount: 0 } : c
                )
            })),

            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
            ],

            setIceServers: (iceServers) => set({ iceServers }),
        }),
        {
            name: 'revoluchat-storage',
            storage: createJSONStorage(() => mmkvStorage),
            partialize: (state) => ({
                channels: state.channels,
                messagesByChannel: state.messagesByChannel,
                iceServers: state.iceServers,
                // activeCall is NOT persisted
            }),
        }
    )
);
