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
  const { theme } = useRevoluchat();
  // For demo, we assume the user ID is accessible via some internal state or we just use a placeholder
  // In a real app, the client would know its own userId
  const myUserId = 'current-user-id'; 

  const defaultRenderItem: ListRenderItem<Message> = ({ item }) => {
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
          <Text
            style={[
              styles.messageText,
              { color: isMe ? '#FFFFFF' : theme.colors.text },
            ]}
          >
            {item.text}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={[styles.timestamp, { color: theme.colors.textSecondary }]}>
            {new Date(item.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
          {isMe && (
            <Text style={[styles.status, { color: item.status === 'read' ? theme.colors.primary : theme.colors.textSecondary }]}>
              {item.status === 'read' ? '✓✓' : '✓'}
            </Text>
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
    marginLeft: 4,
  },
});

