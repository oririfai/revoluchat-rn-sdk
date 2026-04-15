import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';
import { useRevoluchat } from '../RevoluchatProvider';
import { useChannel } from '../hooks/useChannel';
import { useCallContext } from '../CallProvider';
import { Avatar } from './Avatar';
import { BackIcon, PhoneIcon, VideoIcon, SearchIcon, CloseIcon, MenuDotsVerticalIcon, ChevronUpIcon, ChevronDownIcon } from './Icons';

import { TextInput, Modal, Pressable, Dimensions } from 'react-native';



interface ChatHeaderProps {
  roomId: string;
  onBack?: () => void;
  showBack?: boolean;
  containerStyle?: ViewStyle;
  titleStyle?: TextStyle;
  statusStyle?: TextStyle;
  isSearching?: boolean;
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
  onToggleSearch?: () => void;
  searchResultsCount?: number;
  currentResultIndex?: number;
  onNextResult?: () => void;
  onPrevResult?: () => void;
}



export const ChatHeader: React.FC<ChatHeaderProps> = ({
  roomId,
  onBack,
  showBack = true,
  containerStyle,
  titleStyle,
  statusStyle,
  isSearching,
  searchQuery,
  onSearchQueryChange,
  onToggleSearch,
  searchResultsCount = 0,
  currentResultIndex = 0,
  onNextResult,
  onPrevResult,
}) => {


  const { theme, tier } = useRevoluchat();
  const { receiver, isOnline, isTyping } = useChannel(roomId);
  const { initiateCall } = useCallContext();
  const [isMenuVisible, setIsMenuVisible] = React.useState(false);


  const handleAudioCall = () => {
    if (receiver) {
      initiateCall(roomId, parseInt(receiver.id), 'audio', receiver.name);
    }
  };

  const handleVideoCall = () => {
    if (receiver) {
      initiateCall(roomId, parseInt(receiver.id), 'video', receiver.name);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.primary }, containerStyle]}>
      {showBack && !isSearching && (
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <BackIcon size={24} color={theme.colors.primaryText} />
        </TouchableOpacity>
      )}

      {isSearching && (
        <View style={{ width: 12 }} /> // Spacing for hidden back button
      )}

      
      {isSearching ? (
        <View style={styles.content}>
          <TextInput
            style={[styles.searchInput, { color: theme.colors.primaryText, fontFamily: theme.typography.fontFamily }]}
            placeholder="Cari pesan..."
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={searchQuery}
            onChangeText={onSearchQueryChange}
            autoFocus
          />
          {searchQuery !== '' && (
            <View style={styles.searchNav}>
              <Text style={[styles.matchIndicator, { color: theme.colors.primaryText }]}>
                {searchResultsCount > 0 ? `${currentResultIndex + 1} / ${searchResultsCount}` : '0 / 0'}
              </Text>
              <TouchableOpacity 
                onPress={searchResultsCount > 0 ? onPrevResult : undefined} 
                style={[styles.navButton, searchResultsCount === 0 && { opacity: 0.3 }]}
                disabled={searchResultsCount === 0}
              >
                <ChevronUpIcon size={20} color={theme.colors.primaryText} />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={searchResultsCount > 0 ? onNextResult : undefined} 
                style={[styles.navButton, searchResultsCount === 0 && { opacity: 0.3 }]}
                disabled={searchResultsCount === 0}
              >
                <ChevronDownIcon size={20} color={theme.colors.primaryText} />
              </TouchableOpacity>
            </View>
          )}
        </View>


      ) : (
        <View style={styles.content}>
          <Avatar 
              uri={receiver?.avatarUrl} 
              name={receiver?.name || 'User'} 
              size={40} 
              showOnline={true} 
              isOnline={isOnline} 
          />
          <View style={styles.info}>
            <Text style={[
                styles.title, 
                { 
                    color: theme.colors.primaryText,
                    fontFamily: theme.typography.fontFamily,
                    fontSize: theme.typography.fontSizeLg,
                    fontWeight: theme.typography.fontWeightBold,
                }, 
                titleStyle
            ]} numberOfLines={1}>
              {receiver?.name}
            </Text>
            <Text style={[
                styles.status, 
                { 
                    color: 'rgba(255,255,255,0.8)',
                    fontFamily: theme.typography.fontFamily,
                    fontSize: theme.typography.fontSizeSm,
                }, 
                statusStyle
            ]}>
              {isTyping ? 'Sedang mengetik...' : (isOnline ? 'Online' : 'Offline')}
            </Text>
          </View>
        </View>
      )}


      <View style={styles.callButtons}>
        {isSearching ? (
          <TouchableOpacity style={styles.iconButton} onPress={onToggleSearch}>
            <CloseIcon size={20} color={theme.colors.primaryText} />
          </TouchableOpacity>
        ) : (
          <>
            {tier === 'pro' && (
              <TouchableOpacity style={styles.iconButton} onPress={handleVideoCall}>
                <VideoIcon size={20} color={theme.colors.primaryText} />
              </TouchableOpacity>
            )}
            {(tier === 'standard' || tier === 'pro') && (
              <TouchableOpacity style={styles.iconButton} onPress={handleAudioCall}>
                <PhoneIcon size={20} color={theme.colors.primaryText} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.iconButton} onPress={() => setIsMenuVisible(true)}>
              <MenuDotsVerticalIcon size={20} color={theme.colors.primaryText} />
            </TouchableOpacity>
          </>
        )}
      </View>

      <Modal
        visible={isMenuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsMenuVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setIsMenuVisible(false)}
        >
          <View style={[
            styles.menuDropdown, 
            { 
              backgroundColor: theme.colors.surface || '#FFFFFF',
              borderRadius: theme.roundness,
            }
          ]}>
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => {
                setIsMenuVisible(false);
                onToggleSearch?.();
              }}
            >
              <SearchIcon size={20} color={theme.colors.text} />
              <Text style={[styles.menuText, { color: theme.colors.text, fontFamily: theme.typography.fontFamily }]}>
                Cari Pesan
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>


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
  },

  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
  },
  searchNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
  },
  matchIndicator: {
    fontSize: 12,
    marginRight: 8,
    opacity: 0.9,
  },
  navButton: {
    paddingHorizontal: 4,
  },
  modalOverlay: {

    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  menuDropdown: {
    position: 'absolute',
    top: 50,
    right: 16,
    paddingVertical: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    minWidth: 160,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  menuText: {
    marginLeft: 12,
    fontSize: 14,
  },
});


