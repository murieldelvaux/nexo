import React from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { applyMask, MaskType } from '../utils/masks';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  mask?: MaskType;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  containerStyle,
  style,
  mask,
  value,
  onChangeText,
  keyboardType,
  placeholder,
  maxLength,
  ...props
}) => {
  const { theme } = useTheme();

  const handleTextChange = (text: string) => {
    if (!onChangeText) return;
    if (!mask) {
      onChangeText(text);
      return;
    }
    const masked = applyMask(text, mask);
    onChangeText(masked);
  };

  let resolvedKeyboardType = keyboardType;
  let resolvedPlaceholder = placeholder;
  let resolvedMaxLength = maxLength;

  if (mask === 'currency') {
    resolvedKeyboardType = keyboardType || 'numeric';
    resolvedPlaceholder = placeholder || 'R$ 0,00';
  } else if (mask === 'date') {
    resolvedKeyboardType = keyboardType || 'numeric';
    resolvedPlaceholder = placeholder || 'DD/MM/AAAA';
    resolvedMaxLength = maxLength || 10;
  } else if (mask === 'time') {
    resolvedKeyboardType = keyboardType || 'numeric';
    resolvedPlaceholder = placeholder || 'HH:MM';
    resolvedMaxLength = maxLength || 5;
  } else if (mask === 'phone') {
    resolvedKeyboardType = keyboardType || 'phone-pad';
    resolvedPlaceholder = placeholder || '+55 11 99999-9999';
    resolvedMaxLength = maxLength || 19;
  } else if (mask === 'datetime') {
    resolvedKeyboardType = keyboardType || 'numeric';
    resolvedPlaceholder = placeholder || 'DD/MM/AAAA HH:MM';
    resolvedMaxLength = maxLength || 16;
  }

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text> : null}
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.inputBg,
            borderColor: theme.inputBorder,
            color: theme.textPrimary,
          },
          error ? { borderColor: theme.danger } : null,
          style,
        ]}
        placeholderTextColor={theme.textMuted}
        value={value}
        onChangeText={handleTextChange}
        keyboardType={resolvedKeyboardType}
        placeholder={resolvedPlaceholder}
        maxLength={resolvedMaxLength}
        {...props}
      />
      {error ? <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
});
