import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { useHousehold } from '../../src/hooks/useHousehold';
import { showConfirm, showMessage } from '../../src/utils/alert';
import { useTheme } from '../../src/theme/ThemeContext';
import { AppHeader } from '../../src/components/AppHeader';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, updatePhone, isUpdatingPhone } = useAuth();
  const { household, joinHousehold, isJoining } = useHousehold();
  const { theme, isDark, toggleTheme } = useTheme();

  const [inviteCode, setInviteCode] = useState('');
  const [joinError, setJoinError] = useState('');

  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [phoneSaved, setPhoneSaved] = useState(false);

  const handleSavePhone = async () => {
    if (!phoneNumber.trim()) {
      showMessage('Atenção', 'Informe seu número de WhatsApp com DDD (ex: +55 11 99999-9999)');
      return;
    }

    try {
      await updatePhone(phoneNumber.trim());
      setPhoneSaved(true);
      showMessage('Sucesso!', 'Seu WhatsApp foi vinculado ao assistente Nexo.');
    } catch {
      showMessage('Erro', 'Não foi possível salvar o número.');
    }
  };

  const handleShareInvite = async () => {
    if (!household?.inviteCode) return;
    try {
      await Share.share({
        message: `Oi! Entra comigo no Nexo para organizarmos nossas contas e tarefas da casa juntos. Use nosso código de convite: ${household.inviteCode}`,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleJoinWithCode = async () => {
    setJoinError('');
    const code = inviteCode.trim().toUpperCase();
    if (!code) {
      setJoinError('Digite o código de convite.');
      return;
    }
    const doJoin = async () => {
      try {
        await joinHousehold({ inviteCode: code });
        setInviteCode('');
        showMessage('Pronto!', 'Você entrou no espaço compartilhado.');
      } catch (err: any) {
        setJoinError(err?.response?.data?.message || 'Código inválido ou expirado.');
      }
    };
    if (household) {
      showConfirm(
        'Trocar de espaço?',
        'Você sairá do espaço atual e entrará no espaço deste código.',
        doJoin
      );
    } else {
      doJoin();
    }
  };

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n: string) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'NX';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* HEADER PRINCIPAL COM HAMBÚRGUER & LOGO */}
      <AppHeader title="Nexo" subtitle="Ajustes & Configurações" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* CARTÃO DE PERFIL DO USUÁRIO */}
        <View style={[styles.profileCard, { backgroundColor: theme.surface, borderColor: theme.border }, theme.cardShadow]}>
          <View style={[styles.avatarCircle, { backgroundColor: theme.primary }]}>
            <Text style={styles.avatarText}>{userInitials}</Text>
          </View>
          <View style={styles.profileMeta}>
            <Text style={[styles.profileName, { color: theme.textPrimary }]}>
              {user?.name || 'Usuário Nexo'}
            </Text>
            <Text style={[styles.profileEmail, { color: theme.textSecondary }]}>
              {user?.email || ''}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: theme.primaryLight }]}>
              <Text style={[styles.statusBadgeText, { color: theme.primary }]}>
                {household?.name ? `🏠 Espaço: ${household.name}` : '👤 Conta Individual'}
              </Text>
            </View>
          </View>
        </View>

        {/* SEÇÃO 1: WHATSAPP INTEGRADO */}
        <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border }, theme.cardShadow]}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIconBadge, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#DCFCE7' }]}>
              <Text style={{ fontSize: 18 }}>💬</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                Assistente WhatsApp
              </Text>
              <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                Envie áudios, fotos de comprovantes e textos
              </Text>
            </View>
          </View>

          <View style={{ marginTop: 14 }}>
            <Input
              label="Número do WhatsApp (com DDI e DDD)"
              placeholder="+55 11 99999-9999"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
            />
            <Button
              title={phoneSaved ? '✓ WhatsApp Vinculado' : 'Salvar e Conectar'}
              onPress={handleSavePhone}
              isLoading={isUpdatingPhone}
              style={{ marginTop: -4 }}
            />
          </View>

          <View style={[styles.tipBanner, { backgroundColor: theme.surfaceSubtle }]}>
            <Text style={[styles.tipText, { color: theme.textSecondary }]}>
              💡 <Text style={{ fontWeight: '700' }}>Dica:</Text> Basta mandar um áudio como <Text style={{ fontStyle: 'italic' }}>"Gastei 50 no mercado hoje"</Text> ou a foto de uma nota fiscal para a IA registrar na hora.
            </Text>
          </View>
        </View>

        {/* SEÇÃO 2: ESPAÇO DO LAR / HOUSEHOLD */}
        <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border }, theme.cardShadow]}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIconBadge, { backgroundColor: theme.primaryLight }]}>
              <Text style={{ fontSize: 18 }}>🏠</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                Espaço do Lar
              </Text>
              <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                Gestão compartilhada com seu par ou família
              </Text>
            </View>
          </View>

          {household ? (
            <View style={{ marginTop: 14 }}>
              <Text style={[styles.householdTitle, { color: theme.textPrimary }]}>
                {household.name}
              </Text>

              {/* Box de Código de Convite */}
              <View style={[styles.inviteBox, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]}>
                <View>
                  <Text style={[styles.inviteLabel, { color: theme.textSecondary }]}>
                    Código de Convite do Casal
                  </Text>
                  <Text style={[styles.inviteCode, { color: theme.primary }]}>
                    {household.inviteCode}
                  </Text>
                </View>
                <Button
                  title="Compartilhar"
                  variant="secondary"
                  onPress={handleShareInvite}
                  style={styles.shareButton}
                />
              </View>

              <Text style={[styles.subSectionTitle, { color: theme.textSecondary, marginTop: 16 }]}>
                Membros Conectados ({household.members?.length || 1}):
              </Text>
              {household.members?.map((member) => (
                <View key={member.id} style={[styles.memberRow, { borderBottomColor: theme.border }]}>
                  <View style={[styles.memberAvatar, { backgroundColor: theme.primaryLight }]}>
                    <Text style={[styles.memberAvatarText, { color: theme.primary }]}>
                      {member.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.memberName, { color: theme.textPrimary }]}>
                      {member.name} {member.id === user?.id ? '(Você)' : ''}
                    </Text>
                    <Text style={[styles.memberEmail, { color: theme.textSecondary }]}>
                      {member.email}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={{ marginTop: 14 }}>
              <Text style={[styles.noHouseholdText, { color: theme.textSecondary }]}>
                Você ainda está em modo individual. Crie ou entre em um espaço compartilhado para dividir contas automaticamente.
              </Text>
              <Button
                title="Criar ou Entrar em um Lar"
                onPress={() => router.push('/(household)/join')}
                style={{ marginTop: 12 }}
              />
            </View>
          )}

          {/* Entrar em outro espaço com código */}
          <View style={[styles.joinBox, { borderTopColor: theme.border }]}>
            <Text style={[styles.subSectionTitle, { color: theme.textSecondary, marginBottom: 8 }]}>
              Entrar em outro espaço com código:
            </Text>
            <Input
              placeholder="Digite o CÓDIGO (ex: ABCD12)"
              value={inviteCode}
              onChangeText={(text) => {
                setInviteCode(text.toUpperCase());
                setJoinError('');
              }}
              error={joinError}
              autoCapitalize="characters"
            />
            <Button
              title="Trocar de Espaço"
              variant="secondary"
              onPress={handleJoinWithCode}
              isLoading={isJoining}
              style={{ marginTop: -4 }}
            />
          </View>
        </View>

        {/* SEÇÃO 3: APARÊNCIA & TEMA */}
        <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border }, theme.cardShadow]}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIconBadge, { backgroundColor: theme.primaryLight }]}>
              <Text style={{ fontSize: 18 }}>🎨</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                Aparência do Aplicativo
              </Text>
              <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                Escolha o tema para toda a interface
              </Text>
            </View>
          </View>

          <View style={styles.themeSelectorRow}>
            <TouchableOpacity
              style={[
                styles.themeOptionCard,
                {
                  backgroundColor: !isDark ? theme.primaryLight : theme.surfaceSubtle,
                  borderColor: !isDark ? theme.primary : theme.border,
                },
              ]}
              onPress={() => isDark && toggleTheme()}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 24 }}>☀️</Text>
              <Text style={[styles.themeOptionTitle, { color: !isDark ? theme.primary : theme.textPrimary }]}>
                Modo Claro
              </Text>
              <Text style={[styles.themeOptionDesc, { color: theme.textSecondary }]}>
                Fundos limpos off-white
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeOptionCard,
                {
                  backgroundColor: isDark ? theme.primaryLight : theme.surfaceSubtle,
                  borderColor: isDark ? theme.primary : theme.border,
                },
              ]}
              onPress={() => !isDark && toggleTheme()}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 24 }}>🌙</Text>
              <Text style={[styles.themeOptionTitle, { color: isDark ? theme.primary : theme.textPrimary }]}>
                Modo Escuro
              </Text>
              <Text style={[styles.themeOptionDesc, { color: theme.textSecondary }]}>
                Tons profundos elegantes
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* SEÇÃO 4: INFORMAÇÕES & ENCERRAMENTO */}
        <View style={[styles.infoCard, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]}>
          <Text style={[styles.infoTitle, { color: theme.textPrimary }]}>
            Nexo — Versão 1.0.0
          </Text>
          <Text style={[styles.infoText, { color: theme.textSecondary }]}>
            Gestão financeira compartilhada e assistente pessoal para o lar.
          </Text>
          <Text style={[styles.infoNotice, { color: theme.textMuted }]}>
            🔒 Para encerrar a sessão da conta, abra o menu lateral (botão ☰ no topo) e selecione "Sair da Conta".
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 40,
    gap: 16,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 14,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  profileMeta: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '800',
  },
  profileEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sectionCard: {
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  tipBanner: {
    padding: 12,
    borderRadius: 12,
    marginTop: 14,
  },
  tipText: {
    fontSize: 12,
    lineHeight: 18,
  },
  householdTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 10,
  },
  inviteBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  inviteLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  inviteCode: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: 2,
  },
  shareButton: {
    paddingHorizontal: 16,
    height: 38,
  },
  subSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarText: {
    fontSize: 13,
    fontWeight: '700',
  },
  memberName: {
    fontSize: 13,
    fontWeight: '700',
  },
  memberEmail: {
    fontSize: 11,
    marginTop: 1,
  },
  noHouseholdText: {
    fontSize: 13,
    lineHeight: 18,
  },
  joinBox: {
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  themeSelectorRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  themeOptionCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 6,
  },
  themeOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  themeOptionDesc: {
    fontSize: 10,
    textAlign: 'center',
  },
  infoCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  infoText: {
    fontSize: 11,
    textAlign: 'center',
  },
  infoNotice: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
  },
});
