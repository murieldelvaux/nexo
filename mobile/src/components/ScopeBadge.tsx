import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface ScopeBadgeProps {
  scope: 'PRIVATE' | 'SHARED';
  authorName?: string;
}

export const ScopeBadge: React.FC<ScopeBadgeProps> = ({ scope, authorName }) => {
  const { theme } = useTheme();
  const isShared = scope === 'SHARED';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: isShared ? theme.tagSharedBg : theme.tagPrivateBg,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: isShared ? theme.tagSharedText : theme.tagPrivateText,
          },
        ]}
      >
        {isShared ? `🏠 Casa ${authorName ? `(${authorName})` : ''}` : '🔒 Pessoal'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
  },
});
