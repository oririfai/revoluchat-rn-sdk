import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Text,
  ScrollView,
  Image,
} from 'react-native';
import { useMessages } from '../hooks';
import { useRevoluchat } from '../RevoluchatProvider';
import { useChatStore, ChatState } from '../../data/datasources/ChatStore';
import { ImageIcon, AttachIcon, SendIcon, ReplyIcon } from './Icons';
import { Alert } from 'react-native';
import { useRef } from 'react';

interface MessageInputProps {
  roomId: string;
  placeholder?: string;
  onPickImage?: () => Promise<{ uri: string; name: string; type: string; size?: number }[] | null>;
  onPickFile?: () => Promise<{ uri: string; name: string; type: string; size?: number }[] | null>;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  roomId,
  placeholder = 'Type a message...',
  onPickImage,
  onPickFile,
}) => {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<{ uri: string; name: string; type: string; size?: number }[]>([]);
  const { sendAttachments, sendMessage, replyingTo, setReplyingTo, sendTypingStatus } = useMessages(roomId);
  const { theme, tier } = useRevoluchat();
  const setInputHeight = useChatStore((state: ChatState) => state.setInputHeight);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  const handlePickImage = async () => {
    if (onPickImage) {
      const files = await onPickImage();
      if (files && files.length > 0) setAttachments([...attachments, ...files]);
    }
  };

  const handlePickFile = async () => {
    if (onPickFile) {
      const files = await onPickFile();
      if (files && files.length > 0) setAttachments([...attachments, ...files]);
    }
  };

  const handleShareContact = () => {
    Alert.alert('Bagikan Kontak', 'Fitur bagikan kontak akan segera hadir.');
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i: number) => i !== index));
  };

  const handleTextChange = (val: string) => {
    setText(val);
    
    // Typing logic
    if (!isTypingRef.current && val.trim().length > 0) {
      isTypingRef.current = true;
      sendTypingStatus(true);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      sendTypingStatus(false);
    }, 2000);
  };

  const setIsUploading = useChatStore((state: ChatState) => state.setIsUploading);

  const handleSend = async () => {
    try {
      if (attachments.length > 0) {
        setIsUploading(true);
        await sendAttachments(attachments, text.trim() || undefined);
      } else if (text.trim()) {
        sendMessage(text.trim());
      }
      setText('');
      setAttachments([]);
    } catch (error) {
      console.error('[Revoluchat SDK] Failed to send message:', error);
    } finally {
      setIsUploading(false);
      // Stop typing immediately on send
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      isTypingRef.current = false;
      sendTypingStatus(false);
    }
  };

  const replyToText = replyingTo ? (replyingTo.text || (replyingTo.attachments?.length ? (replyingTo.attachments[0].type === 'image' ? 'Gambar' : 'Dokumen') : '...')) : '';
  const isSendDisabled = !text.trim() && attachments.length === 0;

  return (
    <View 
        style={[styles.outerContainer, { backgroundColor: 'transparent' }]}
        onLayout={(e) => setInputHeight(e.nativeEvent.layout.height)}
    >
      <View style={[
          styles.inputWrapper, 
          { 
              backgroundColor: theme.colors.inputBackground,
              borderColor: theme.colors.border,
              borderTopWidth: 1,
              borderRadius: theme.roundness * 2
          }
      ]}>
        {replyingTo && (
          <View style={[styles.replyPreview, { backgroundColor: 'transparent' }]}>
            <View style={[styles.replyAccent, { backgroundColor: theme.colors.primary }]} />
            <View style={styles.replyContent}>
              <View style={styles.replyIconLabel}>
                <ReplyIcon size={12} color={theme.colors.primary} />
                <Text style={[styles.replyLabel, { color: theme.colors.primary }]}>
                  Membalas ke {replyingTo.sender.name}
                </Text>
              </View>
              <Text style={[styles.replyBody, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                {replyToText}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.closeReply} 
              onPress={() => setReplyingTo(null)}
            >
              <View style={[styles.closeReplyCircle, { backgroundColor: 'rgba(0,0,0,0.1)' }]}>
                <Text style={{ 
                    color: theme.colors.textSecondary, 
                    fontSize: 14,
                    fontFamily: theme.typography.fontFamily 
                }}>×</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {attachments.length > 0 && (
          <View style={styles.previewContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {attachments.map((att: any, index: number) => {
                const extension = att.name.split('.').pop()?.toUpperCase() || 'FILE';
                return (
                  <View key={`${att.uri}-${index}`} style={styles.previewItem}>
                    {att.type.startsWith('image/') ? (
                      <Image source={{ uri: att.uri }} style={styles.previewImage} />
                    ) : (
                      <View style={[styles.filePreview, { backgroundColor: theme.colors.background }]}>
                        <AttachIcon size={20} color={theme.colors.textSecondary} />
                        <Text style={{ 
                            color: theme.colors.textSecondary, 
                            fontSize: 10, 
                            fontWeight: 'bold',
                            fontFamily: theme.typography.fontFamily,
                            marginTop: 4 
                        }}>
                            {extension}
                        </Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeAttachment(index)}
                    >
                      <Text style={styles.removeButtonText}>×</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}

        <View style={styles.container}>
          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.actionButton} onPress={handlePickImage}>
              <ImageIcon size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            {tier === 'pro' && (
                <TouchableOpacity style={styles.actionButton} onPress={handlePickFile}>
                    <AttachIcon size={24} color={theme.colors.textSecondary} />
                </TouchableOpacity>
            )}
          </View>

          <TextInput
            style={[
                styles.input, 
                { 
                    color: theme.colors.text,
                    fontFamily: theme.typography.fontFamily,
                    fontSize: theme.typography.fontSizeMd
                }
            ]}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.textSecondary}
            value={text}
            onChangeText={handleTextChange}
            multiline
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              { 
                  backgroundColor: isSendDisabled ? theme.colors.border : theme.colors.primary, 
                  borderRadius: 20 
              },
            ]}
            onPress={handleSend}
            disabled={isSendDisabled}
          >
            <SendIcon size={20} color={theme.colors.primaryText} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
    zIndex: 10,
  },
  previewContainer: {
    paddingHorizontal: 10,
    paddingTop: 10,
    height: 80,
  },
  previewItem: {
    marginRight: 10,
    width: 60,
    height: 60,
  },
  previewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  filePreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  removeButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  inputWrapper: {
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  container: {
    flexDirection: 'row',
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    alignItems: 'flex-end',
  },
  actionButton: {
    padding: 4,
    marginBottom: 2,
  },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 100,
    paddingTop: 6,
    paddingBottom: 6,
    fontSize: 15,
  },
  sendButton: {
    marginLeft: 10,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  replyPreview: {
    flexDirection: 'row',
    paddingTop: 14,
    paddingBottom: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.03)',
  },
  replyAccent: {
    width: 4,
    height: '100%',
    borderRadius: 2,
    marginRight: 10,
  },
  replyContent: {
    flex: 1,
    justifyContent: 'center',
  },
  replyIconLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  replyLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  replyBody: {
    fontSize: 13,
  },
  closeReply: {
    padding: 4,
  },
  closeReplyCircle: {
      width: 24,
      height: 24,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
  },
});
