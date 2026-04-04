import React from 'react';
import {
  FlatList,
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  ListRenderItem,
} from 'react-native';
import { useRevoluchat } from '../RevoluchatProvider';
import { useChannels } from '../hooks';
import { Channel } from '../../domain/entities/Channel';

import { Avatar } from './Avatar';
import { relativeDate } from '../../utils/dateFormatter';

interface ChannelListProps {
  onChannelPress?: (channel: Channel) => void;
  renderItem?: ListRenderItem<Channel>;
}

export const ChannelList: React.FC<ChannelListProps> = ({
  onChannelPress,
  renderItem,
}) => {
  const { channels } = useChannels();
  const { theme, userId } = useRevoluchat();

  const defaultRenderItem: ListRenderItem<Channel> = ({ item }) => {
    const lastMsg = item.lastMessage;
    const otherMember = item.type === 'direct' 
      ? item.members.find(m => m.id?.toString() !== userId?.toString()) 
      : null;
    const displayAvatar = item.type === 'direct' ? otherMember?.avatarUrl : item.members[0]?.avatarUrl;
    const displayName = item.type === 'direct' ? (otherMember?.name || item.name) : item.name;
    
    return (
      <TouchableOpacity
        style={[styles.itemContainer, { borderBottomColor: theme.colors.border }]}
        onPress={() => onChannelPress?.(item)}
      >
        <Avatar name={displayName} uri={displayAvatar} />
        <View style={styles.textContainer}>
          <View style={styles.headerRow}>
            <Text
              style={[
                styles.name,
                {
                  color: theme.colors.text,
                  fontSize: theme.typography.fontSizeMd,
                  fontWeight: theme.typography.fontWeightBold,
                },
              ]}
              numberOfLines={1}
            >
              {displayName || (item.type === 'direct' ? 'Direct Message' : 'Group Chat')}
            </Text>
            {lastMsg && (
              <Text
                style={[
                  styles.time,
                  {
                    color: theme.colors.textSecondary,
                    fontSize: theme.typography.fontSizeSm,
                  },
                ]}
              >
                {lastMsg.displayTime || relativeDate(lastMsg.createdAt)}
              </Text>
            )}
          </View>
          <View style={styles.footerRow}>
            <Text
              style={[
                styles.lastMessage,
                {
                  color: theme.colors.textSecondary,
                  fontSize: theme.typography.fontSizeSm,
                },
              ]}
              numberOfLines={1}
            >
              {lastMsg?.text || 'No messages yet'}
            </Text>
            {item.unreadCount > 0 && (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: theme.colors.primary, borderRadius: 10 },
                ]}
              >
                <Text style={styles.badgeText}>{item.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (channels.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
          No conversations found.
        </Text>
        <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
          Tap the + button to start a demo chat.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={channels}
      renderItem={renderItem || defaultRenderItem}
      keyExtractor={(item) => item.id}
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.listContent}
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 20,
  },
  itemContainer: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    flex: 1,
    marginRight: 8,
  },
  time: {
    marginLeft: 4,
  },
  lastMessage: {
    flex: 1,
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
  },
});
