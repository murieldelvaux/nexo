import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';

interface ScopeBadgeProps {
  scope: 'PRIVATE' | 'SHARED';
  authorName?: string;
}

export const ScopeBadge: React.FC<ScopeBadgeProps> = ({ scope, authorName }) => {
  const isShared = scope === 'SHARED';

  return (
    <View style={[styles.badge, isShared ? styles.sharedBadge : styles.privateBadge]}>
      <Text style={[styles.text, isShared ? styles.sharedText : styles.privateText]}>
        {isShared ? `🏠 Compartilhado ${authorName ? ` (${authorName})` : ''}` : '🔒 Privado'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  sharedBadge: {
    backgroundColor: Colors.primaryMuted,
  },
  privateBadge: {
    backgroundColor: 'rgba(142, 142, 147, 0.15)',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
  sharedText: {
    color: Colors.primary,
  },
  privateText: {
    color: Colors.textSecondary,
  },
});
