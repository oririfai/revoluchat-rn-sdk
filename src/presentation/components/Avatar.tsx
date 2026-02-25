import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useRevoluchat } from '../RevoluchatProvider';


interface AvatarProps {
  uri?: string;
  name?: string;
  size?: number;
  showOnline?: boolean;
  isOnline?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({
  uri,
  name,
  size = 40,
  showOnline = false,
  isOnline = false,
}) => {
  const { theme } = useRevoluchat();
  
  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
        />
      ) : (
        <View
          style={[
            styles.placeholder,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.initials,
              {
                color: theme.colors.textSecondary,
                fontSize: size * 0.4,
                fontWeight: theme.typography.fontWeightBold,
              },
            ]}
          >
            {initials}
          </Text>
        </View>
      )}
      {showOnline && (
        <View
          style={[
            styles.onlineBadge,
            {
              backgroundColor: isOnline ? theme.colors.online : theme.colors.border,
              width: size * 0.25,
              height: size * 0.25,
              borderRadius: size * 0.125,
              bottom: 0,
              right: 0,
              borderColor: theme.colors.background,
            },
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    backgroundColor: '#eee',
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  initials: {
    textAlign: 'center',
  },
  onlineBadge: {
    position: 'absolute',
    borderWidth: 2,
  },
});
