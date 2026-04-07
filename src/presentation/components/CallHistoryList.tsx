import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useCallHistory, CallHistoryItem } from '../hooks/useCallHistory';
import { useCallContext } from '../CallProvider';
import { useRevoluchat } from '../RevoluchatProvider';
import { 
  PhoneIcon, 
  VideoIcon, 
  IncomingIcon, 
  OutgoingIcon 
} from './Icons';

export const CallHistoryList: React.FC = () => {
  const { history, isLoading, error, refresh } = useCallHistory();
  const { initiateCall } = useCallContext();
  const { theme } = useRevoluchat();

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) return 'Hari ini';
    return date.toLocaleDateString();
  };

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const handleCallBack = (item: CallHistoryItem) => {
    initiateCall(
      item.conversation_id,
      item.other_party.id,
      item.type,
      item.other_party.name
    );
  };

  const renderItem = ({ item }: { item: CallHistoryItem }) => {
    const isMissed = item.status === 'missed';
    const isIncoming = item.direction === 'incoming';
    const isVideo = item.type === 'video';
    
    return (
      <View style={[styles.itemContainer, { borderBottomColor: theme.colors.border }]}>
        <View style={styles.avatarContainer}>
          {item.other_party.avatar_url ? (
            <Image source={{ uri: item.other_party.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.primary + '15' }]}>
              <Text style={[styles.avatarText, { color: theme.colors.primary }]}>
                {item.other_party.name.charAt(0)}
              </Text>
            </View>
          )}
          <View style={styles.typeIconContainer}>
             {isVideo ? <VideoIcon size={12} color={theme.colors.primary} /> : <PhoneIcon size={12} color={theme.colors.primary} />}
          </View>
        </View>

        <View style={styles.infoContainer}>
          <Text style={[styles.name, { color: isMissed ? '#F44336' : theme.colors.text }]} numberOfLines={1}>
            {item.other_party.name}
          </Text>
          <View style={styles.metaRow}>
            <View style={styles.directionIconContainer}>
               {isIncoming ? <IncomingIcon size={14} color={isMissed ? '#F44336' : '#4CAF50'} /> : <OutgoingIcon size={14} color={theme.colors.primary} />}
            </View>
            <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
              {isIncoming ? 'Masuk' : 'Keluar'} • {formatDate(item.started_at)}, {formatTime(item.started_at)}
            </Text>
          </View>
          <View style={styles.statusRow}>
             <Text style={[
               styles.statusText, 
               { color: isMissed ? '#F44336' : item.status === 'rejected' ? '#FF9800' : '#4CAF50' }
             ]}>
                {item.status === 'completed' ? 'Diterima' : 
                 item.status === 'missed' ? (isIncoming ? 'Tidak Terajawab' : 'Dibatalkan') : 
                 item.status === 'rejected' ? 'Ditolak' : item.status}
             </Text>
             {item.status === 'completed' && item.duration_seconds > 0 && (
                <Text style={[styles.durationText, { color: theme.colors.textSecondary }]}>
                   • {formatDuration(item.duration_seconds)}
                </Text>
             )}
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.callBackButton, { backgroundColor: theme.colors.primary + '10' }]}
          onPress={() => handleCallBack(item)}
        >
          {isVideo ? <VideoIcon size={20} color={theme.colors.primary} /> : <PhoneIcon size={20} color={theme.colors.primary} />}
        </TouchableOpacity>
      </View>
    );
  };

  if (isLoading && history.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (error && history.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={{ color: theme.colors.textSecondary }}>{error}</Text>
        <TouchableOpacity onPress={refresh} style={styles.retryButton}>
          <Text style={{ color: theme.colors.primary }}>Coba Lagi</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      data={history}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={refresh} colors={[theme.colors.primary]} />
      }
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={{ color: theme.colors.textSecondary }}>Belum ada riwayat panggilan</Text>
        </View>
      }
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 20,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  typeIconContainer: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 2,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  infoContainer: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  directionIconContainer: {
    marginRight: 6,
  },
  metaText: {
    fontSize: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  durationText: {
    fontSize: 12,
  },
  callBackButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  retryButton: {
    marginTop: 12,
    padding: 8,
  }
});
