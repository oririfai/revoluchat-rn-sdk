import React from 'react';
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  ListRenderItem,
} from 'react-native';
import { useMessages } from '../hooks';
import { useRevoluchat } from '../RevoluchatProvider';
import { Message } from '../../domain/entities/Message';


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

  const defaultRenderItem: ListRenderItem<Message> = ({ item }) => {
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
            },
          ]}
        >
          {item.attachments && item.attachments.length > 0 && (
            <View style={styles.attachmentsContainer}>
              {item.attachments.map((att) => (
                <View key={att.id} style={styles.attachmentItem}>
                  <Text style={{ color: isMe ? '#EEE' : theme.colors.textSecondary, fontSize: 12 }}>
                    📎 {att.name} ({att.type})
                  </Text>
                </View>
              ))}
            </View>
          )}
          {item.text && (
            <Text
              style={[
                styles.messageText,
                { color: isMe ? '#FFFFFF' : theme.colors.text },
              ]}
            >
              {item.text}
            </Text>
          )}
        </View>
        <View style={styles.metaRow}>
          <Text style={[styles.timestamp, { color: theme.colors.textSecondary }]}>
            {new Date(item.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
          {isMe && (
            <View style={styles.statusContainer}>
              {item.status === 'read' ? (
                <Text style={[styles.status, { color: theme.colors.primary }]}>✓✓</Text>
              ) : item.status === 'delivered' ? (
                <Text style={[styles.status, { color: theme.colors.textSecondary }]}>✓✓</Text>
              ) : item.status === 'sent' ? (
                <Text style={[styles.status, { color: theme.colors.textSecondary }]}>✓</Text>
              ) : item.status === 'failed' ? (
                <Text style={[styles.status, { color: theme.colors.error || '#FF3B30' }]}>!</Text>
              ) : (
                <Text style={[styles.status, { color: theme.colors.textSecondary }]}>...</Text>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };


  return (
    <FlatList
      data={[...messages].reverse()} // Inverted list expects newest first
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
  statusContainer: {
    marginLeft: 4,
  },
  attachmentsContainer: {
    marginBottom: 4,
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

