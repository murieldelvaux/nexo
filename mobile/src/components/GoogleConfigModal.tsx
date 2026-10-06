import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import { Colors } from '../theme/colors';

interface GoogleConfigModalProps {
  visible: boolean;
  onClose: () => void;
  onDevLogin: (email: string, name: string) => void;
  isLoading?: boolean;
}

export function GoogleConfigModal({
  visible,
  onClose,
  onDevLogin,
  isLoading = false,
}: GoogleConfigModalProps) {
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const handleCustomSubmit = () => {
    if (!customEmail.trim()) return;
    onDevLogin(
      customEmail.trim().toLowerCase(),
      customName.trim() || customEmail.split('@')[0],
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.select({ ios: 'padding', default: undefined })}
              style={styles.modalCard}
            >
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Ícone e Título */}
                <View style={styles.header}>
                  <View style={styles.badgeIcon}>
                    <Text style={styles.badgeText}>G</Text>
                  </View>
                  <Text style={styles.title}>Autenticação com Google</Text>
                  <Text style={styles.subtitle}>
                    O login oficial requer as credenciais do Google Cloud Console no arquivo{' '}
                    <Text style={styles.codeHighlight}>.env</Text>.
                  </Text>
                </View>

                {/* Box de Chaves Necessárias */}
                <View style={styles.keysBox}>
                  <Text style={styles.keysTitle}>🔑 Parâmetros que devem ser preenchidos:</Text>
                  <Text style={styles.keyItem}>
                    • <Text style={styles.keyBold}>EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID</Text> (no .env raiz)
                  </Text>
                  <Text style={styles.keyItem}>
                    • <Text style={styles.keyBold}>EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID</Text> (no .env raiz)
                  </Text>
                  <Text style={styles.keyItem}>
                    • <Text style={styles.keyBold}>GOOGLE_CLIENT_IDS</Text> (no backend/.env)
                  </Text>
                </View>

                {/* Seção de Teste em Modo Dev */}
                <View style={styles.devSection}>
                  <Text style={styles.devSectionTitle}>
                    🚀 Testar agora (Modo Desenvolvimento):
                  </Text>
                  <Text style={styles.devSectionSub}>
                    Você pode simular o login com Google imediatamente enquanto configura as chaves:
                  </Text>

                  {!showCustom ? (
                    <View style={styles.accountButtons}>
                      <TouchableOpacity
                        style={styles.accountBtn}
                        onPress={() => onDevLogin('murieldelvaux@gmail.com', 'Muriel Daher')}
                        disabled={isLoading}
                        activeOpacity={0.8}
                      >
                        <View style={[styles.avatar, { backgroundColor: '#0A84FF' }]}>
                          <Text style={styles.avatarText}>M</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.accountName}>Muriel Daher</Text>
                          <Text style={styles.accountEmail}>murieldelvaux@gmail.com</Text>
                        </View>
                        <Text style={styles.arrow}>→</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.accountBtn}
                        onPress={() => onDevLogin('lucas@gmail.com', 'Lucas')}
                        disabled={isLoading}
                        activeOpacity={0.8}
                      >
                        <View style={[styles.avatar, { backgroundColor: '#30D158' }]}>
                          <Text style={styles.avatarText}>L</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.accountName}>Lucas</Text>
                          <Text style={styles.accountEmail}>lucas@gmail.com</Text>
                        </View>
                        <Text style={styles.arrow}>→</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.toggleCustomBtn}
                        onPress={() => setShowCustom(true)}
                      >
                        <Text style={styles.toggleCustomText}>+ Usar outro e-mail Google</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.customForm}>
                      <TextInput
                        style={styles.input}
                        placeholder="Nome (Ex: Muriel)"
                        placeholderTextColor={Colors.textMuted}
                        value={customName}
                        onChangeText={setCustomName}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="seu.email@gmail.com"
                        placeholderTextColor={Colors.textMuted}
                        value={customEmail}
                        onChangeText={setCustomEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                      <TouchableOpacity
                        style={[styles.submitBtn, !customEmail.trim() && styles.btnDisabled]}
                        onPress={handleCustomSubmit}
                        disabled={!customEmail.trim() || isLoading}
                      >
                        <Text style={styles.submitBtnText}>
                          {isLoading ? 'Conectando...' : 'Entrar com este e-mail →'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.backCustomBtn}
                        onPress={() => setShowCustom(false)}
                      >
                        <Text style={styles.backCustomText}>← Voltar</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Botão Fechar */}
                <TouchableOpacity style={styles.closeBtn} onPress={onClose} disabled={isLoading}>
                  <Text style={styles.closeBtnText}>Fechar</Text>
                </TouchableOpacity>
              </ScrollView>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 22,
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  badgeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  badgeText: {
    color: '#4285F4',
    fontSize: 26,
    fontWeight: '900',
  },
  title: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  codeHighlight: {
    color: Colors.primary,
    fontWeight: '700',
  },
  keysBox: {
    backgroundColor: 'rgba(255,159,10,0.08)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,159,10,0.25)',
    marginBottom: 18,
  },
  keysTitle: {
    color: Colors.warning,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  keyItem: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  keyBold: {
    color: Colors.text,
    fontWeight: '700',
  },
  devSection: {
    marginBottom: 14,
  },
  devSectionTitle: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  devSectionSub: {
    color: Colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  accountButtons: {
    gap: 8,
  },
  accountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceCard,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
  accountName: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  accountEmail: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  arrow: {
    color: Colors.textMuted,
    fontSize: 14,
  },
  toggleCustomBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  toggleCustomText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  customForm: {
    gap: 10,
  },
  input: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: Colors.text,
    fontSize: 14,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  backCustomBtn: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  backCustomText: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  closeBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 8,
  },
  closeBtnText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
});
