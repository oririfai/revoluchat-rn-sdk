import React from 'react';
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  ListRenderItem,
  Image,
} from 'react-native';
import { useMessages } from '../hooks';
import { useRevoluchat } from '../RevoluchatProvider';
import { Message } from '../../domain/entities/Message';


import { ImageGrid } from './ImageGrid';

interface MessageListProps {
  roomId: string;
  renderMessage?: ListRenderItem<Message>;
}

export const MessageList: React.FC<MessageListProps> = ({
  roomId,
  renderMessage,
}) => {
  const { messages } = useMessages(roomId);
  const { theme, userId } = useRevoluchat();
  const myUserId = userId; 

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

  const processedItems = groupMessagesByDate(messages);

  const defaultRenderItem: ListRenderItem<any> = ({ item }) => {
    if (item.type === 'date_separator') {
      return (
        <View style={styles.dateSeparatorContainer}>
          <View style={[styles.dateSeparator, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.dateSeparatorText, { color: theme.colors.textSecondary }]}>
              {formatDateSeparator(item.date)}
            </Text>
          </View>
        </View>
      );
    }

    if (item.type === 'system_call_summary') {
            return (
                <View style={styles.systemBubbleContainer}>
                    <View style={[styles.systemBubble, { backgroundColor: theme.colors.background, borderColor: theme.colors.textSecondary + '40', borderRadius: theme.roundness * 2 }]}>
                        <Text style={[styles.systemText, { color: theme.colors.textSecondary }]}>
                            {item.metadata?.call_type === 'video' ? '📹 ' : '📞 '}
                            {item.text}
                        </Text>
                    </View>
                </View>
            );
        }

    const isMe = item.sender.id === myUserId;
    const imageAttachments = item.attachments?.filter((a: any) => a.type === 'image') || [];
    const audioAttachments = item.attachments?.filter((a: any) => a.type === 'audio') || [];
    const videoAttachments = item.attachments?.filter((a: any) => a.type === 'video') || [];
    const otherAttachments = item.attachments?.filter((a: any) => !['image', 'audio', 'video'].includes(a.type)) || [];

    return (
      <View
        style={[
          styles.bubbleContainer,
          isMe ? styles.myBubbleContainer : styles.otherBubbleContainer,
        ]}
      >
        {!isMe && (
          <Text style={[styles.senderName, { color: theme.colors.textSecondary }]}>
            {item.sender.name}
          </Text>
        )}
        <View
          style={[
            styles.bubble,
            {
              borderRadius: theme.roundness,
              backgroundColor: isMe ? theme.colors.bubbleUser : theme.colors.bubbleOther,
              padding: (imageAttachments.length > 0 || audioAttachments.length > 0 || videoAttachments.length > 0) && !item.text ? 4 : 12,
            },
          ]}
        >
          {imageAttachments.length > 0 && (
            <View style={styles.mediaContainer}>
              <ImageGrid images={imageAttachments} />
            </View>
          )}

          {audioAttachments.length > 0 && (
            <View style={styles.attachmentsContainer}>
              {audioAttachments.map((att: any) => (
                <View key={att.id} style={styles.attachmentItem}>
                  <Text style={{ color: isMe ? '#EEE' : theme.colors.textSecondary, fontSize: 13 }}>
                    🎵 Rekaman Suara: {att.name || 'Voice Message'}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {videoAttachments.length > 0 && (
            <View style={styles.attachmentsContainer}>
              {videoAttachments.map((att: any) => (
                <View key={att.id} style={styles.attachmentItem}>
                  <Text style={{ color: isMe ? '#EEE' : theme.colors.textSecondary, fontSize: 13 }}>
                    🎥 Video: {att.name}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {otherAttachments.length > 0 && (
            <View style={styles.attachmentsContainer}>
              {otherAttachments.map((att: any) => (
                <View key={att.id} style={styles.attachmentItem}>
                  <Text style={{ color: isMe ? '#EEE' : theme.colors.textSecondary, fontSize: 13 }}>
                    📎 {att.name}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {item.text && (
            <Text
              style={[
                styles.messageText,
                { 
                    color: isMe ? '#FFFFFF' : theme.colors.text,
                    marginTop: imageAttachments.length > 0 || otherAttachments.length > 0 ? 8 : 0
                },
              ]}
            >
              {item.text}
            </Text>
          )}
        </View>
        <View style={styles.metaRow}>
          <Text style={[styles.timestamp, { color: theme.colors.textSecondary }]}>
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
      </View>
    );
  };


  return (
    <FlatList
      data={[...processedItems].reverse() as any[]} // Inverted list expects newest first
      renderItem={renderMessage || defaultRenderItem}
      keyExtractor={(item) => item.id}
      inverted
      contentContainerStyle={styles.listContent}
      style={{ backgroundColor: theme.colors.background }}
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    padding: 16,
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
  systemText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

