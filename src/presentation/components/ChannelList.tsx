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

interface ChannelListProps {
  onChannelPress?: (channel: Channel) => void;
  renderItem?: ListRenderItem<Channel>;
}

export const ChannelList: React.FC<ChannelListProps> = ({
  onChannelPress,
  renderItem,
}) => {
  const channels = useChannels();
  const { theme } = useRevoluchat();

  const defaultRenderItem: ListRenderItem<Channel> = ({ item }) => {
    const lastMsg = item.lastMessage;
    
    return (
      <TouchableOpacity
        style={[styles.itemContainer, { borderBottomColor: theme.colors.border }]}
        onPress={() => onChannelPress?.(item)}
      >
        <Avatar name={item.name} uri={item.members[0]?.avatarUrl} />
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
              {item.name || 'Group Chat'}
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
                {new Date(lastMsg.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
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
});
