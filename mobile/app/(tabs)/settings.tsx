import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../src/theme/colors';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { Card } from '../../src/components/Card';
import { useAuth } from '../../src/hooks/useAuth';
import { useHousehold } from '../../src/hooks/useHousehold';
import { showConfirm, showMessage } from '../../src/utils/alert';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout, updatePhone, isUpdatingPhone } = useAuth();
  const { household, joinHousehold, isJoining } = useHousehold();
  const [inviteCode, setInviteCode] = useState('');
  const [joinError, setJoinError] = useState('');

  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [phoneSaved, setPhoneSaved] = useState(false);

  const handleSavePhone = async () => {
    if (!phoneNumber.trim()) {
      showMessage('Atenção', 'Informe seu número de WhatsApp no formato +55 11 99999-9999');
      return;
    }

    try {
      await updatePhone(phoneNumber.trim());
      setPhoneSaved(true);
      showMessage('Sucesso!', 'Seu WhatsApp foi vinculado ao Nexo.');
    } catch {
      showMessage('Erro', 'Não foi possível salvar o número.');
    }
  };

  const handleShareInvite = async () => {
    if (!household?.inviteCode) return;
    try {
      await Share.share({
        message: `Oi amor! Entra comigo no Nexo para organizarmos nossas contas e tarefas da casa. Use nosso código de convite: ${household.inviteCode}`,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleJoinWithCode = async () => {
    setJoinError('');
    const code = inviteCode.trim().toUpperCase();
    if (!code) {
      setJoinError('Digite o código de grupo.');
      return;
    }
    const doJoin = async () => {
      try {
        await joinHousehold({ inviteCode: code });
        setInviteCode('');
        showMessage('Pronto!', 'Você entrou no espaço.');
      } catch (err: any) {
        setJoinError(err?.response?.data?.message || 'Código inválido ou expirado.');
      }
    };
    if (household) {
      showConfirm('Trocar de espaço?', 'Você sairá do espaço atual e entrará no espaço deste código.', doJoin);
    } else {
      doJoin();
    }
  };

  const handleLogout = () => {
    showConfirm('Sair do Nexo', 'Tem certeza que deseja encerrar sua sessão?', logout);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Configurações</Text>
          <Text style={styles.subtitle}>Gerencie seu perfil, WhatsApp e espaço.</Text>
        </View>

        {/* Card do Casal / Household */}
        <Card style={styles.sectionCard} variant="bordered">
          <Text style={styles.sectionHeading}>🏠 Espaço</Text>

          {household ? (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.householdTitle}>{household.name}</Text>

              <View style={styles.inviteBox}>
                <View>
                  <Text style={styles.inviteLabel}>Código de Convite do Espaço</Text>
                  <Text style={styles.inviteCode}>{household.inviteCode}</Text>
                </View>
                <Button
                  title="Compartilhar"
                  variant="secondary"
                  onPress={handleShareInvite}
                  style={styles.shareButton}
                />
              </View>

              <Text style={[styles.sectionSub, { marginTop: 16 }]}>Membros Conectados:</Text>
              {household.members?.map((member) => (
                <View key={member.id} style={styles.memberRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{member.name.charAt(0)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>
                      {member.name} {member.id === user?.id ? '(Você)' : ''}
                    </Text>
                    <Text style={styles.memberEmail}>{member.email}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.sectionSub}>
                Você ainda não está conectado a um espaço compartilhado.
              </Text>
              <Button
                title="Criar ou Entrar em um Espaço"
                onPress={() => router.push('/(household)/join')}
                style={{ marginTop: 14 }}
              />
            </View>
          )}
        </Card>

        {/* Entrar em espaço com código */}
        <Card style={styles.sectionCard} variant="bordered">
          <Text style={styles.sectionHeading}>🔑 Entrar com código de grupo</Text>
          <Text style={styles.sectionSub}>
            Recebeu um código de convite? Digite abaixo para entrar no espaço de outra pessoa.
          </Text>
          <Input
            label="Código de Convite"
            placeholder="Ex: NEXO-7X8K"
            autoCapitalize="characters"
            value={inviteCode}
            onChangeText={(t) => {
              setInviteCode(t);
              setJoinError('');
            }}
            containerStyle={{ marginTop: 14 }}
          />
          {joinError ? <Text style={{ color: Colors.danger, fontSize: 13, marginBottom: 10 }}>{joinError}</Text> : null}
          <Button title="Entrar no Espaço" onPress={handleJoinWithCode} isLoading={isJoining} />
        </Card>

        {/* Card do WhatsApp */}
        <Card style={styles.sectionCard} variant="bordered">
          <Text style={styles.sectionHeading}>💬 Integração WhatsApp</Text>
          <Text style={styles.sectionSub}>
            Cadastre seu número com DDD para enviar áudios e mensagens que viram gastos e
            lembretes no app.
          </Text>

          <Input
            label="Seu Número de WhatsApp"
            placeholder="+55 11 99999-9999"
            keyboardType="phone-pad"
            value={phoneNumber}
            onChangeText={(text) => {
              setPhoneNumber(text);
              setPhoneSaved(false);
            }}
            containerStyle={{ marginTop: 14 }}
          />

          <Button
            title={phoneSaved ? '✓ WhatsApp Vinculado' : 'Salvar Número'}
            variant={phoneSaved ? 'secondary' : 'primary'}
            onPress={handleSavePhone}
            isLoading={isUpdatingPhone}
          />
        </Card>

        {/* Perfil & Logout */}
        <Card style={styles.sectionCard} variant="bordered">
          <Text style={styles.sectionHeading}>👤 Minha Conta</Text>
          <View style={{ marginTop: 10, gap: 4 }}>
            <Text style={styles.infoLabel}>Nome: <Text style={styles.infoValue}>{user?.name}</Text></Text>
            <Text style={styles.infoLabel}>Email: <Text style={styles.infoValue}>{user?.email}</Text></Text>
          </View>

          <Button
            title="Encerrar Sessão"
            variant="danger"
            onPress={handleLogout}
            style={{ marginTop: 20 }}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: 20, paddingBottom: 60 },
  header: { marginBottom: 20 },
  title: { color: Colors.text, fontSize: 26, fontWeight: '800' },
  subtitle: { color: Colors.textSecondary, fontSize: 13, marginTop: 4 },
  sectionCard: { marginBottom: 16 },
  sectionHeading: { color: Colors.text, fontSize: 17, fontWeight: '700' },
  sectionSub: { color: Colors.textSecondary, fontSize: 13, marginTop: 6, lineHeight: 18 },
  householdTitle: { color: Colors.primary, fontSize: 20, fontWeight: '800', marginBottom: 12 },
  inviteBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inviteLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  inviteCode: { color: Colors.text, fontSize: 18, fontWeight: '800', letterSpacing: 1, marginTop: 2 },
  shareButton: { paddingVertical: 8, paddingHorizontal: 12 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  memberName: { color: Colors.text, fontSize: 15, fontWeight: '600' },
  memberEmail: { color: Colors.textMuted, fontSize: 12 },
  infoLabel: { color: Colors.textSecondary, fontSize: 14 },
  infoValue: { color: Colors.text, fontWeight: '600' },
});
