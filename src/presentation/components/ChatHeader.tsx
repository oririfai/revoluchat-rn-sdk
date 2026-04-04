import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';
import { useRevoluchat } from '../RevoluchatProvider';
import { useChannel } from '../hooks/useChannel';
import { Avatar } from './Avatar';

interface ChatHeaderProps {
  roomId: string;
  onBack?: () => void;
  showBack?: boolean;
  containerStyle?: ViewStyle;
  titleStyle?: TextStyle;
  statusStyle?: TextStyle;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  roomId,
  onBack,
  showBack = true,
  containerStyle,
  titleStyle,
  statusStyle,
}) => {
  const { theme } = useRevoluchat();
  const { receiver, isOnline } = useChannel(roomId);

  if (!receiver) {
      return (
          <View style={[styles.container, { backgroundColor: theme.colors.primary }, containerStyle]}>
              {showBack && (
                  <TouchableOpacity onPress={onBack} style={styles.backButton}>
                      <Text style={styles.backText}>←</Text>
                  </TouchableOpacity>
              )}
              <Text style={[styles.title, { color: '#FFFFFF' }, titleStyle]}>Chat</Text>
              <View style={{ flex: 1 }} />
              <View style={styles.callButtons}>
                <TouchableOpacity style={styles.iconButton}>
                  <Text style={styles.iconText}>📞</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconButton}>
                  <Text style={styles.iconText}>📹</Text>
                </TouchableOpacity>
              </View>
          </View>
      );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.primary }, containerStyle]}>
      {showBack && (
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
      )}
      
      <View style={styles.content}>
        <Avatar 
            uri={receiver.avatarUrl} 
            name={receiver.name} 
            size={40} 
            showOnline={true} 
            isOnline={isOnline} 
        />
        <View style={styles.info}>
          <Text style={[styles.title, { color: '#FFFFFF' }, titleStyle]} numberOfLines={1}>
            {receiver.name}
          </Text>
          <Text style={[styles.status, { color: 'rgba(255,255,255,0.8)' }, statusStyle]}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>

      <View style={styles.callButtons}>
        <TouchableOpacity style={styles.iconButton}>
          <Text style={styles.iconText}>📞</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton}>
          <Text style={styles.iconText}>📹</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  backText: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  info: {
    marginLeft: 12,
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  status: {
    fontSize: 12,
  },
  callButtons: {
    flexDirection: 'row',
  },
  iconButton: {
    marginLeft: 12,
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  iconText: {
    fontSize: 18,
  },
});
