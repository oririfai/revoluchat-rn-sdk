import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Text,
} from 'react-native';
import { useMessages } from '../hooks';

import { useRevoluchat } from '../RevoluchatProvider';


interface MessageInputProps {
  roomId: string;
  placeholder?: string;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  roomId,
  placeholder = 'Type a message...',
}) => {
  const [text, setText] = useState('');
  const { sendMessage } = useMessages(roomId);
  const { theme } = useRevoluchat();

  const handleSend = () => {
    if (text.trim()) {
      sendMessage(text.trim());
      setText('');
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background,
          borderTopColor: theme.colors.border,
        },
      ]}
    >
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
            backgroundColor: text.trim() ? theme.colors.primary : theme.colors.border,
            borderRadius: 20,
          },
        ]}
        onPress={handleSend}
        disabled={!text.trim()}
      >
        <Text style={styles.sendButtonText}>send</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
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
