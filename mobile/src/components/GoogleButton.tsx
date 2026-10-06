import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Colors } from '../theme/colors';

interface GoogleButtonProps {
  title?: string;
  onPress: () => void;
  isLoading?: boolean;
}

export function GoogleButton({
  title = 'Continuar com o Google',
  onPress,
  isLoading = false,
}: GoogleButtonProps) {
  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      disabled={isLoading}
      activeOpacity={0.85}
    >
      {isLoading ? (
        <ActivityIndicator color={Colors.text} size="small" />
      ) : (
        <>
          <View style={styles.iconContainer}>
            {/* Ícone estilizado do Google com 4 cores oficiais */}
            <View style={styles.googleG}>
              <Text style={styles.googleLetter}>G</Text>
            </View>
          </View>
          <Text style={styles.title}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
    gap: 12,
  },
  iconContainer: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleG: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleLetter: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
    fontFamily: Platform.select({ ios: 'Helvetica Neue', default: 'sans-serif' }),
  },
  title: {
    color: '#1F2937',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
