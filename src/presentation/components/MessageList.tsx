import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Pressable,
  Dimensions,
  Image,
  ListRenderItem,
  Animated,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useMessages, useChannel } from '../hooks';
import { useRevoluchat } from '../RevoluchatProvider';
import { useChatStore, ChatState } from '../../data/datasources/ChatStore';
import { Message } from '../../domain/entities/Message';
import { ImageGrid } from './ImageGrid';
import { ImageViewerModal } from './ImageViewerModal';
import { PhoneIcon, VideoIcon, AudioIcon, FileIcon, AttachIcon, DeleteIcon, ReplyIcon, BannedIcon, ScrollDownIcon, DownloadIcon } from './Icons';
import { useState, useRef, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';

import { FileDownloader } from '../../utils/FileDownloader';

interface MessageListProps {
  roomId: string;
  renderMessage?: ListRenderItem<Message>;
  searchQuery?: string;
  activeSearchIndex?: number;
  onSearchResultsUpdate?: (count: number) => void;
}

export interface MessageListRef {
    scrollToMatch: (matchIndex: number) => void;
}

export const MessageList = forwardRef<MessageListRef, MessageListProps>(({
  roomId,
  renderMessage,
  searchQuery,
  activeSearchIndex = -1,
  onSearchResultsUpdate,
}, ref) => {

  const { messages, hasMore, isLoadingMore, loadMore, deleteMessage, setReplyingTo } = useMessages(roomId);

  const { theme, userId } = useRevoluchat();
  const { receiver, isTyping } = useChannel(roomId);
  const inputHeight = useChatStore((state: ChatState) => state.inputHeight);
  const isUploading = useChatStore((state: ChatState) => state.isUploading);
  const downloadedAttachments = useChatStore((state: ChatState) => state.downloadedAttachments || []);
  const markAttachmentAsDownloaded = useChatStore((state: ChatState) => state.markAttachmentAsDownloaded);
  const myUserId = userId; 
  const flatListRef = useRef<FlatList>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [viewingImage, setViewingImage] = useState<{message: Message, attachment: any} | null>(null);
  const highlightAnim = useRef(new Animated.Value(0)).current;
  const loaderAnim = useRef(new Animated.Value(0)).current;
  const lastNewestMessageId = useRef<string | null>(messages[0]?.id || null);
  const prevMessageCount = useRef(messages.length);

  useEffect(() => {
    Animated.timing(loaderAnim, {
        toValue: isLoadingMore ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
    }).start();
  }, [isLoadingMore]);

  const uploadAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(uploadAnim, {
      toValue: isUploading ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isUploading]);

  useEffect(() => {
    // Auto scroll to bottom when a new message is sent by ME
    const currentCount = messages.length;
    const countDiff = currentCount - prevMessageCount.current;
    prevMessageCount.current = currentCount;

    if (currentCount > 0) {
      const newestMessage = messages[0]; // Inverted list, index 0 is newest
      
      // Only scroll to bottom if:
      // 1. The newest message ID has changed (prevents scrolling on history load)
      // 2. The increase in messages is small (typically 1-2 for real-time messages, not 20+ for history)
      // 3. The message was sent by the current user.
      if (newestMessage.id !== lastNewestMessageId.current) {
        const isHistoryLoad = countDiff > 5; // Heuristic: more than 5 messages at once is likely history
        
        if (!isHistoryLoad && newestMessage.sender.id === userId) {
          console.log(`[Revoluchat SDK] Auto-scrolling to bottom. Count diff: ${countDiff}`);
          scrollToBottom();
        }
        
        lastNewestMessageId.current = newestMessage.id;
      }
    } else {
        lastNewestMessageId.current = null;
    }
  }, [messages.length, userId]);

  const [menuVisible, setMenuVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0, width: 0 });

  const messageRefs = useRef<{[key: string]: View | null}>({});

  const showOptionsMenu = (message: Message, refKey: string) => {
    const view = messageRefs.current[refKey];
    if (view) {
      view.measure((x, y, width, height, pageX, pageY) => {
        setMenuPosition({
          x: pageX,
          y: pageY + height,
          width: width,
        });
        setSelectedMessage(message);
        setMenuVisible(true);
      });
    }
  };

  const handleDownloadAttachment = async (att: any) => {
      let url = att.url || att.fileUrl || att.file_url || att.path;
      if (url) {
          try {
              const fileName = att.name || `file_${Date.now()}`;
              
              // Cloudinary URL Normalization: Fix mismatch for PDFs
              if (url.includes('cloudinary.com') && url.includes('/upload/')) {
                  // Cloudinary treats PDFs as 'image', but backend might use 'raw' in URL string
                  if (url.includes('/raw/upload/') && url.toLowerCase().endsWith('.pdf')) {
                      console.log('[Revoluchat SDK] Normalizing Cloudinary PDF resource type: raw -> image');
                      url = url.replace('/raw/upload/', '/image/upload/');
                  }
              }

              // Cari mimeType yang valid (harus mengandung '/')
              let mimeType = att.mime_type || att.contentType || att.mimeType || att.type;
              if (!mimeType || !mimeType.includes('/')) {
                  mimeType = 'application/octet-stream';
              }
              
              await FileDownloader.download(url, fileName, mimeType);
              markAttachmentAsDownloaded(att.id || att.name || url);
          } catch (e) {
              console.error("Failed to download file:", e);
          }
      }
  };

  const handleReply = () => {
    setMenuVisible(false);
    if (selectedMessage) {
      setReplyingTo(selectedMessage);
    }
  };

  const scrollToMessage = (messageId: string) => {
    // Find index in reversed processedItems
    const reversedItems = [...processedItems].reverse();
    const index = reversedItems.findIndex(m => m.id === messageId);
    
    if (index !== -1 && flatListRef.current) {
        flatListRef.current.scrollToIndex({ 
            index, 
            animated: true,
            viewPosition: 0.5 
        });
        
        // Brief highlight
        setHighlightedMessageId(messageId);
        setTimeout(() => setHighlightedMessageId(null), 1500);
    }
  };

  const scrollToBottom = () => {
    // Best practice for long chat lists: immediate jump is faster and prevents lag
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
  };

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    if (offsetY > 300 && !showScrollButton) {
      setShowScrollButton(true);
    } else if (offsetY <= 300 && showScrollButton) {
      setShowScrollButton(false);
    }
  };

  const handleDelete = () => {
    if (selectedMessage) {
        setMenuVisible(false);
        setDeleteConfirmVisible(true);
    }
  };

  const confirmDelete = () => {
    if (selectedMessage) {
        deleteMessage(selectedMessage.id);
        setDeleteConfirmVisible(false);
    }
  };

  const formatDateSeparator = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    };
    return date.toLocaleDateString('id-ID', options);
  };

  const groupMessagesByDate = (messages: Message[]) => {
    if (messages.length === 0) return [];
    
    const sortedMessages = [...messages].sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const items: (Message | { id: string; type: 'date_separator'; date: Date })[] = [];
    let lastDate = '';

    sortedMessages.forEach((msg) => {
      const msgDate = new Date(msg.createdAt);
      const dateStr = msgDate.toDateString();

      if (dateStr !== lastDate) {
        items.push({
          id: `date-${dateStr}`,
          type: 'date_separator',
          date: msgDate
        });
        lastDate = dateStr;
      }
      items.push(msg);
    });

    return items;
  };

  const filteredMessages = useMemo(() => {
    return messages.filter(m => !(m.sender.id === myUserId && m.deletedAt));
  }, [messages, myUserId]);
  
  const searchResults = useMemo(() => {
    if (!searchQuery) return [];
    const query = searchQuery.toLowerCase();
    return filteredMessages
      .filter(m => m.text?.toLowerCase().includes(query))
      .map(m => m.id);
  }, [filteredMessages, searchQuery]);

  useEffect(() => {
    onSearchResultsUpdate?.(searchResults.length);
  }, [searchResults.length]);

  const processedItems = useMemo(() => {
    return groupMessagesByDate(filteredMessages);
  }, [filteredMessages]);

  const reversedData = useMemo(() => {
    return [...processedItems].reverse();
  }, [processedItems]);


  useImperativeHandle(ref, () => ({
    scrollToMatch: (matchIndex: number) => {
        if (matchIndex < 0 || matchIndex >= searchResults.length) return;
        const messageId = searchResults[matchIndex];
        
        // Find position in processedItems (which is what FlatList renders)
        // FlatList data is [...processedItems].reverse()
        const flatData = [...processedItems].reverse();
        const index = flatData.findIndex(item => item.id === messageId);
        
        if (index !== -1) {
            flatListRef.current?.scrollToIndex({
                index,
                animated: true,
                viewPosition: 0.5
            });
            
            // Temporary strong highlight
            setHighlightedMessageId(messageId);
            setTimeout(() => setHighlightedMessageId(null), 2000);
        }
    }
  }), [processedItems, searchResults]);



  if (isTyping) {
    processedItems.push({ id: 'typing-indicator', type: 'typing_indicator' } as any);
  }

  const defaultRenderItem: ListRenderItem<any> = ({ item }) => {
    if (item.type === 'date_separator') {
      return (
        <View style={styles.dateSeparatorContainer}>
          <View style={[styles.dateSeparator, { backgroundColor: theme.colors.surface, borderRadius: theme.roundness }]}>
            <Text style={[
                styles.dateSeparatorText, 
                { 
                    color: theme.colors.textSecondary,
                    fontFamily: theme.typography.fontFamily,
                }
            ]}>
              {formatDateSeparator(item.date)}
            </Text>
          </View>
        </View>
      );
    }

    if (item.type === 'system_call_summary') {
            return (
                <View style={styles.systemBubbleContainer}>
                    <View style={[
                        styles.systemBubble, 
                        { 
                            backgroundColor: theme.colors.background, 
                            borderColor: theme.colors.border, 
                            borderRadius: theme.roundness * 2 
                        }
                    ]}>
                        <View style={styles.systemRow}>
                            {item.metadata?.call_type === 'video' ? 
                                <VideoIcon size={14} color={theme.colors.textSecondary} /> : 
                                <PhoneIcon size={14} color={theme.colors.textSecondary} />
                            }
                            <Text style={[
                                styles.systemText, 
                                { 
                                    color: theme.colors.textSecondary, 
                                    marginLeft: 6,
                                    fontFamily: theme.typography.fontFamily,
                                }
                            ]}>
                                {item.text}
                            </Text>
                        </View>
                    </View>
                </View>
            );
        }

    if (item.type === 'typing_indicator') {
        return (
            <View style={styles.typingContainer}>
                <Text style={[
                    styles.typingText, 
                    { 
                        color: theme.colors.textSecondary,
                        fontFamily: theme.typography.fontFamily 
                    }
                ]}>
                    {receiver?.name} sedang mengetik...
                </Text>
            </View>
        );
    }
    const isMe = item.sender.id === myUserId;
    const isDeleted = !!item.deletedAt;

    const replyToMessage = item.replyToId ? messages.find(m => m.id === item.replyToId) : null;

    const imageAttachments = isDeleted ? [] : (item.attachments?.filter((a: any) => a.type === 'image') || []);
    const audioAttachments = isDeleted ? [] : (item.attachments?.filter((a: any) => a.type === 'audio') || []);
    const videoAttachments = isDeleted ? [] : (item.attachments?.filter((a: any) => a.type === 'video') || []);
    const otherAttachments = isDeleted ? [] : (item.attachments?.filter((a: any) => !['image', 'audio', 'video'].includes(a.type)) || []);

    const isActiveResult = activeSearchIndex >= 0 && item.id === (searchResults[activeSearchIndex] || null);
    const isMatch = searchQuery && item.text?.toLowerCase().includes(searchQuery.toLowerCase());

    return (
      <View 
        style={[
            { width: '100%', paddingHorizontal: 16 },
            item.id === highlightedMessageId && {
                backgroundColor: highlightAnim.interpolate({

                    inputRange: [0, 1],
                    outputRange: ['transparent', theme.colors.primary + '22']
                }) as any
            },
            isMatch && {
                backgroundColor: isActiveResult ? theme.colors.primary + '25' : theme.colors.primary + '0D',
            }
        ]}
      >
        <Animated.View 
            style={[
                styles.bubbleContainer,
                isMe ? styles.myBubbleContainer : styles.otherBubbleContainer,
            ]}
        >

        <TouchableOpacity
          ref={ref => (messageRefs.current[item.id] = ref)}
          onLongPress={() => !isDeleted && showOptionsMenu(item, item.id)}
          activeOpacity={0.8}
          style={[
            styles.bubble,
            {
              borderRadius: theme.roundness,
              borderTopRightRadius: isMe ? 0 : theme.roundness,
              borderTopLeftRadius: isMe ? theme.roundness : 0,
              backgroundColor: isMe ? theme.colors.bubbleUser : theme.colors.bubbleOther,
              paddingHorizontal: (imageAttachments.length > 0 || audioAttachments.length > 0 || videoAttachments.length > 0) ? (item.text || replyToMessage ? 8 : 6) : 12,
              paddingVertical: (imageAttachments.length > 0 || audioAttachments.length > 0 || videoAttachments.length > 0) ? (item.text || replyToMessage ? 8 : 6) : 8,
              opacity: isDeleted ? 0.7 : 1,
            },
          ]}
        >
          {replyToMessage && (
            <TouchableOpacity 
                activeOpacity={0.7}
                onPress={() => scrollToMessage(replyToMessage.id)}
                style={[
                    styles.replyContainer, 
                    { 
                        backgroundColor: isMe ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)', 
                        borderLeftColor: isMe ? theme.colors.bubbleUserText : theme.colors.primary 
                    }
                ]}
            >
              <Text style={[
                  styles.replySender, 
                  { 
                      color: isMe ? theme.colors.bubbleUserText : theme.colors.primary,
                      fontFamily: theme.typography.fontFamily,
                  }
              ]} numberOfLines={1}>
                {replyToMessage.sender.name}
              </Text>
              <Text 
                style={[
                    styles.replyText, 
                    { 
                        color: isMe ? theme.colors.bubbleUserText : theme.colors.textSecondary,
                        fontFamily: theme.typography.fontFamily,
                    },
                    replyToMessage.deletedAt ? { fontStyle: 'italic' } : {}
                ]} 
                numberOfLines={1}
              >
                {replyToMessage.deletedAt ? 'Pesan telah dihapus' : (replyToMessage.text || (replyToMessage.attachments?.length ? (replyToMessage.attachments[0].type === 'image' ? 'Gambar' : 'Dokumen') : '...'))}
              </Text>
            </TouchableOpacity>
          )}

          {isDeleted ? (
            <View style={styles.deletedRow}>
               <BannedIcon size={16} color={isMe ? theme.colors.bubbleUserText : theme.colors.textSecondary} />
               <Text style={[
                   styles.deletedText, 
                   { 
                       color: isMe ? theme.colors.bubbleUserText : theme.colors.textSecondary, 
                       marginLeft: 6,
                       fontFamily: theme.typography.fontFamily,
                       fontStyle: 'italic'
                   }
               ]}>
                 Pesan telah dihapus
               </Text>
            </View>
          ) : (
            <>
              {imageAttachments.length > 0 && (
                <View style={styles.mediaContainer}>
                  <ImageGrid 
                    images={imageAttachments} 
                    onLongPress={() => !isDeleted && showOptionsMenu(item, item.id)}
                    onImagePress={(attachment) => setViewingImage({ message: item, attachment })}
                  />
                </View>
              )}

          {audioAttachments.length > 0 && (
            <View style={styles.attachmentsContainer}>
              {audioAttachments.map((att: any) => (
                <View key={att.id} style={styles.attachmentItem}>
                  <View style={styles.attachmentRow}>
                    <AudioIcon size={16} color={isMe ? theme.colors.bubbleUserText : theme.colors.primary} />
                    <Text style={{ 
                        color: isMe ? theme.colors.bubbleUserText : theme.colors.textSecondary, 
                        fontSize: 13, 
                        marginLeft: 6,
                        fontFamily: theme.typography.fontFamily,
                    }}>
                      Rekaman Suara: {att.name || 'Voice Message'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {videoAttachments.length > 0 && (
            <View style={styles.attachmentsContainer}>
              {videoAttachments.map((att: any) => (
                <View key={att.id} style={styles.attachmentItem}>
                  <View style={styles.attachmentRow}>
                    <VideoIcon size={16} color={isMe ? theme.colors.bubbleUserText : theme.colors.primary} />
                    <Text style={{ 
                        color: isMe ? theme.colors.bubbleUserText : theme.colors.textSecondary, 
                        fontSize: 13, 
                        marginLeft: 6,
                        fontFamily: theme.typography.fontFamily,
                    }}>
                      Video: {att.name}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {otherAttachments.length > 0 && (
            <View style={styles.attachmentsContainer}>
              {otherAttachments.map((att: any) => (
                <View key={att.id} style={[
                    styles.attachmentItem, 
                    { 
                        backgroundColor: isMe ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.04)',
                        padding: 10,
                        borderRadius: theme.roundness,
                        minWidth: 160
                    }
                ]}>
                  <View style={[styles.attachmentRow, { justifyContent: 'space-between' }]}>
                    <View style={[styles.attachmentRow, { flex: 1, paddingRight: 8 }]}>
                        <View style={[
                            styles.docIconBox, 
                            { backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : theme.colors.primary + '15' }
                        ]}>
                            <AttachIcon size={18} color={isMe ? theme.colors.bubbleUserText : theme.colors.primary} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={{ 
                            color: isMe ? theme.colors.bubbleUserText : theme.colors.primary, 
                            fontSize: 11, 
                            fontWeight: 'bold',
                            fontFamily: theme.typography.fontFamily,
                            marginBottom: 1
                        }}>
                            Dokumen
                        </Text>
                        <Text 
                            style={{ 
                                color: isMe ? theme.colors.bubbleUserText : theme.colors.text, 
                                fontSize: 13,
                                fontFamily: theme.typography.fontFamily,
                            }}
                            numberOfLines={2}
                        >
                            {att.name}
                        </Text>
                        </View>
                    </View>
                    
                        <TouchableOpacity
                            onPress={() => handleDownloadAttachment(att)}
                            style={{
                                width: 32,
                                height: 32,
                                borderRadius: 16,
                                backgroundColor: isMe ? 'rgba(255,255,255,0.25)' : theme.colors.primary + '1A',
                                justifyContent: 'center',
                                alignItems: 'center',
                                display: (att.id && downloadedAttachments.includes(att.id)) || (att.url && downloadedAttachments.includes(att.url)) ? 'none' : 'flex',
                            }}
                        >
                            <DownloadIcon size={16} color={isMe ? theme.colors.bubbleUserText : theme.colors.primary} />
                        </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

              {item.text && (
                <Text
                  style={[
                    styles.messageText,
                    { 
                        color: isMe ? theme.colors.bubbleUserText : theme.colors.text,
                        fontFamily: theme.typography.fontFamily,
                        marginTop: imageAttachments.length > 0 || otherAttachments.length > 0 || replyToMessage ? 8 : 0
                    },
                  ]}
                >
                  {item.text}
                </Text>
              )}
            </>
          )}
        </TouchableOpacity>
        <View style={styles.metaRow}>
          <Text style={[
              styles.timestamp, 
              { 
                  color: theme.colors.textSecondary,
                  fontFamily: theme.typography.fontFamily,
              }
          ]}>
            {item.displayTime || new Date(item.createdAt).toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            })}
          </Text>
          {isMe && (
            <View style={styles.statusContainer}>
              {item.status === 'read' ? (
                <Image 
                  source={require('../../../assets/readed.png')} 
                  style={styles.statusIcon} 
                />
              ) : item.status === 'failed' ? (
                <Image 
                  source={require('../../../assets/error.png')} 
                  style={styles.statusIcon} 
                />
              ) : (
                <Image 
                  source={require('../../../assets/unread.png')} 
                  style={styles.statusIcon} 
                />
              )}
            </View>
          )}
        </View>
      </Animated.View>
      </View>
    );
  };

  const renderFloatingLoader = () => {
    return (
        <Animated.View 
            style={[
                styles.floatingLoader,
                { 
                    opacity: loaderAnim,
                    transform: [{
                        translateY: loaderAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-20, 0]
                        })
                    }],
                    backgroundColor: theme.colors.surface + 'E6', // 90% opacity surface
                    borderColor: theme.colors.border + '33',
                }
            ]}
            pointerEvents="none"
        >
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={[
                styles.floatingLoaderText, 
                { color: theme.colors.textSecondary, fontFamily: theme.typography.fontFamily }
            ]}>
                Memuat...
            </Text>
        </Animated.View>
    );
  };




  return (
    <View style={{ flex: 1 }}>
        {renderFloatingLoader()}
        <FlatList
            ref={flatListRef}
            data={reversedData as any[]} // Inverted list expects newest first
            renderItem={renderMessage || defaultRenderItem}
            keyExtractor={(item) => item.id}
            inverted
            contentContainerStyle={[styles.listContent, { paddingTop: inputHeight + 10, paddingBottom: 20 }]}
            style={{ backgroundColor: theme.colors.background }}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            onEndReached={() => hasMore && !isLoadingMore && loadMore()}
            onEndReachedThreshold={0.5}
            initialNumToRender={20}
            maxToRenderPerBatch={10}
            windowSize={10}
            removeClippedSubviews={true}
            ListFooterComponent={null}
            maintainVisibleContentPosition={{
                minIndexForVisible: 0,
            }}


            onScrollToIndexFailed={(info) => {

                flatListRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: true });
            }}

        />

        <Modal
            visible={menuVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setMenuVisible(false)}
        >
            <Pressable 
                style={styles.modalOverlay} 
                onPress={() => setMenuVisible(false)}
            >
                <View 
                    style={[
                        styles.menuContainer, 
                        { 
                            top: menuPosition.y + 5, 
                            left: Math.min(Dimensions.get('window').width - 170, Math.max(10, menuPosition.x)), // Keep within screen
                            backgroundColor: theme.colors.surface,
                            borderRadius: theme.roundness,
                        }
                    ]}
                >
                    <TouchableOpacity style={styles.menuItem} onPress={handleReply}>
                        <ReplyIcon size={18} color={theme.colors.primary} />
                        <Text style={[
                            styles.menuItemText, 
                            { 
                                color: theme.colors.text,
                                fontFamily: theme.typography.fontFamily 
                            }
                        ]}>Balas</Text>
                    </TouchableOpacity>
                    
                    {selectedMessage?.sender.id === myUserId && !selectedMessage?.deletedAt && (
                        <TouchableOpacity 
                            style={[styles.menuItem, { borderTopWidth: 1, borderTopColor: theme.colors.border + '20' }]} 
                            onPress={handleDelete}
                        >
                            <DeleteIcon size={18} color={theme.colors.error} />
                            <Text style={[
                                styles.menuItemText, 
                                { 
                                    color: theme.colors.error,
                                    fontFamily: theme.typography.fontFamily 
                                }
                            ]}>Hapus</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </Pressable>
        </Modal>

        {showScrollButton && (
          <TouchableOpacity 
            style={[
                styles.scrollToBottomButton, 
                { 
                    bottom: inputHeight + 20, 
                    backgroundColor: theme.colors.surface || '#FFFFFF' 
                }
            ]} 
            onPress={scrollToBottom}
            activeOpacity={0.8}
          >
            <ScrollDownIcon size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        )}

        {isUploading && (
          <Animated.View 
              style={[
                  styles.uploadIndicator,
                  {
                      bottom: inputHeight + 20,
                      opacity: uploadAnim,
                      transform: [{
                          translateY: uploadAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [20, 0]
                          })
                      }]
                  }
              ]}
          >
              <View style={[styles.uploadPill, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <View style={[styles.uploadDot, { backgroundColor: theme.colors.primary }]} />
                  <Text style={[
                      styles.uploadText, 
                      { 
                          color: theme.colors.textSecondary,
                          fontFamily: theme.typography.fontFamily 
                      }
                  ]}>
                      Sedang mengirim...
                  </Text>
              </View>
          </Animated.View>
        )}

        <Modal
            visible={deleteConfirmVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setDeleteConfirmVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.confirmContainer, { borderRadius: theme.roundness }]}>
                    <View style={styles.confirmHeader}>
                        <Text style={[
                            styles.confirmTitle, 
                            { 
                                color: theme.colors.text,
                                fontFamily: theme.typography.fontFamily 
                            }
                        ]}>Hapus pesan ini?</Text>
                        <Text style={[
                            styles.confirmSubtitle, 
                            { 
                                color: theme.colors.textSecondary,
                                fontFamily: theme.typography.fontFamily 
                            }
                        ]}>
                            Tindakan ini tidak dapat dibatalkan.
                        </Text>
                    </View>
                    
                    <View style={styles.confirmActions}>
                        <TouchableOpacity 
                            onPress={() => setDeleteConfirmVisible(false)}
                            style={styles.confirmButton}
                        >
                            <Text style={[
                                styles.confirmButtonText, 
                                { 
                                    color: theme.colors.textSecondary,
                                    fontFamily: theme.typography.fontFamily 
                                }
                            ]}>BATAL</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            onPress={confirmDelete}
                            style={styles.confirmButton}
                        >
                            <Text style={[
                                styles.confirmButtonText, 
                                { 
                                    color: theme.colors.error,
                                    fontFamily: theme.typography.fontFamily 
                                }
                            ]}>HAPUS</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>

        <ImageViewerModal
            visible={viewingImage !== null}
            onClose={() => setViewingImage(null)}
            message={viewingImage?.message || null}
            attachment={viewingImage?.attachment || null}
            onReply={setReplyingTo}
        />
    </View>
  );
});


const styles = StyleSheet.create({
  listContent: {
    paddingVertical: 16,
  },

  dateSeparatorContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateSeparator: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dateSeparatorText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bubbleContainer: {
    marginBottom: 12,
    maxWidth: '80%',
  },
  myBubbleContainer: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  otherBubbleContainer: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  messageText: {
    fontSize: 15,
  },
  senderName: {
    fontSize: 12,
    marginBottom: 2,
    marginLeft: 4,
  },
  timestamp: {
    fontSize: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginHorizontal: 4,
  },
  status: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  statusIcon: {
    width: 14,
    height: 14,
    resizeMode: 'contain',
  },
  statusContainer: {
    marginLeft: 4,
  },
  attachmentsContainer: {
    marginBottom: 4,
  },
  mediaContainer: {
    marginBottom: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  attachmentItem: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: 6,
    borderRadius: 4,
    marginBottom: 2,
  },
  docIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  floatingLoader: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  floatingLoaderText: {
    fontSize: 12,
    marginLeft: 6,
  },
  systemBubbleContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  systemBubble: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  systemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  systemText: {
    fontSize: 12,
    fontWeight: '500',
  },
  replyContainer: {
    padding: 8,
    borderRadius: 4,
    borderLeftWidth: 3,
    marginBottom: 4,
  },
  replySender: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  replyText: {
    fontSize: 12,
  },
  deletedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deletedText: {
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    position: 'absolute',
    width: 160,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    overflow: 'hidden',
    borderRadius: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 12,
  },
  confirmContainer: {
    width: '80%',
    padding: 20,
    backgroundColor: '#FFFFFF',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  confirmHeader: {
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  confirmSubtitle: {
    fontSize: 14,
    textAlign: 'left',
    lineHeight: 20,
  },
  confirmActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: '100%',
  },
  scrollToBottomButton: {
    position: 'absolute',
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    zIndex: 20,
  },
  uploadIndicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 15,
  },
  uploadPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  uploadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  uploadText: {
    fontSize: 12,
    fontWeight: '600',
  },
  confirmButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 16,
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  typingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 8,
  },
  typingText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});
