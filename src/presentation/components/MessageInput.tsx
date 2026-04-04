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
  const { sendAttachments, sendMessage } = useMessages(roomId);
  const { theme } = useRevoluchat();

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

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i: number) => i !== index));
  };

  const handleSend = () => {
    if (attachments.length > 0) {
      sendAttachments(attachments, text.trim() || undefined);
    } else if (text.trim()) {
      sendMessage(text.trim());
    }
    setText('');
    setAttachments([]);
  };

  const isSendDisabled = !text.trim() && attachments.length === 0;

  return (
    <View style={[styles.outerContainer, { backgroundColor: theme.colors.background }]}>
      {attachments.length > 0 && (
        <View style={styles.previewContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {attachments.map((att: any, index: number) => (
              <View key={`${att.uri}-${index}`} style={styles.previewItem}>
                {att.type.startsWith('image/') ? (
                  <Image source={{ uri: att.uri }} style={styles.previewImage} />
                ) : (
                  <View style={[styles.filePreview, { backgroundColor: theme.colors.surface }]}>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 10 }}>File</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeAttachment(index)}
                >
                  <Text style={styles.removeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      <View
        style={[
          styles.container,
          {
            borderTopColor: theme.colors.border,
          },
        ]}
      >
        <View style={styles.actionsContainer}>
          <TouchableOpacity onPress={handlePickImage} style={styles.actionButton}>
              <Text style={{ fontSize: 20 }}>🖼️</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handlePickFile} style={styles.actionButton}>
              <Text style={{ fontSize: 20 }}>📎</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.surface,
              color: theme.colors.text,
              borderRadius: theme.roundness,
              paddingHorizontal: theme.spacing.md,
            },
          ]}
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textSecondary}
          multiline
        />

        <TouchableOpacity
          style={[
            styles.sendButton,
            {
              backgroundColor: !isSendDisabled ? theme.colors.primary : theme.colors.border,
              borderRadius: 20,
            },
          ]}
          onPress={handleSend}
          disabled={isSendDisabled}
        >
          <Text style={styles.sendButtonText}>send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    paddingBottom: 10,
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
  actionButton: {
    padding: 4,
  },
  container: {
    flexDirection: 'row',
    padding: 10,
    alignItems: 'flex-end',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingTop: 8,
    paddingBottom: 8,
    fontSize: 15,
  },
  sendButton: {
    marginLeft: 10,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
});
