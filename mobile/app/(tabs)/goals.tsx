import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { Colors } from '../../src/theme/colors';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { ScopeBadge } from '../../src/components/ScopeBadge';
import { LoadingState } from '../../src/components/LoadingState';
import { EmptyState } from '../../src/components/EmptyState';
import { useGoals } from '../../src/hooks/useGoals';
import { formatCurrency, formatDate } from '../../src/utils/format';
import { RecordScope } from '../../../packages/shared/src';

export default function GoalsScreen() {
  const { goals, isLoading, createGoal, isCreating, addProgress, deleteGoal, refetch, isRefetching } =
    useGoals();

  const [modalVisible, setModalVisible] = useState(false);
  const [progressModalVisible, setProgressModalVisible] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [scope, setScope] = useState<RecordScope>(RecordScope.SHARED);
  const [amountToAdd, setAmountToAdd] = useState('');

  const handleCreate = async () => {
    const target = parseFloat(targetAmount.replace(',', '.'));
    const current = currentAmount ? parseFloat(currentAmount.replace(',', '.')) : 0;

    if (!title.trim() || isNaN(target) || target <= 0) {
      Alert.alert('Atenção', 'Informe um título e valor de meta válido.');
      return;
    }

    try {
      await createGoal({
        title: title.trim(),
        targetAmount: target,
        currentAmount: current,
        scope,
      });
      setTitle('');
      setTargetAmount('');
      setCurrentAmount('');
      setModalVisible(false);
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar a meta.');
    }
  };

  const handleAddProgress = async () => {
    if (!selectedGoalId) return;
    const add = parseFloat(amountToAdd.replace(',', '.'));
    if (isNaN(add) || add <= 0) {
      Alert.alert('Atenção', 'Informe um valor para adicionar à meta.');
      return;
    }

    try {
      await addProgress({ id: selectedGoalId, dto: { amountToAdd: add } });
      setAmountToAdd('');
      setProgressModalVisible(false);
    } catch {
      Alert.alert('Erro', 'Não foi possível atualizar o progresso.');
    }
  };

  const handleDelete = (id: string, goalTitle: string) => {
    Alert.alert('Excluir Meta', `Deseja remover "${goalTitle}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteGoal(id) },
    ]);
  };

  if (isLoading) return <LoadingState />;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Metas do Compartilhadas & Pessoais</Text>
          <Button
            title="+ Nova Meta"
            onPress={() => setModalVisible(true)}
            style={styles.addButton}
          />
        </View>
        <Text style={styles.subtitle}>
          Planeje viagens, reservas de emergência e conquistas juntos.
        </Text>
      </View>

      <FlatList
        data={goals}
        keyExtractor={(item) => item.id}
        refreshing={isRefetching}
        onRefresh={refetch}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            title="Nenhuma meta cadastrada"
            description="Crie metas em comum ou individuais para acompanhar a evolução do dinheiro."
            actionTitle="+ Criar Primeira Meta"
            onAction={() => setModalVisible(true)}
          />
        }
        renderItem={({ item }) => {
          const progressPercent = Math.min(
            100,
            Math.round((item.currentAmount / item.targetAmount) * 100),
          );

          return (
            <View style={styles.goalCard}>
              <View style={styles.goalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.goalTitle}>{item.title}</Text>
                  <ScopeBadge scope={item.scope} />
                </View>
                <TouchableOpacity
                  onPress={() => handleDelete(item.id, item.title)}
                  style={styles.deleteButton}
                >
                  <Text style={{ fontSize: 16 }}>🗑️</Text>
                </TouchableOpacity>
              </View>

              {/* Valores */}
              <View style={styles.amountRow}>
                <Text style={styles.currentVal}>{formatCurrency(item.currentAmount)}</Text>
                <Text style={styles.targetVal}>de {formatCurrency(item.targetAmount)}</Text>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
              </View>
              <Text style={styles.progressText}>{progressPercent}% atingido</Text>

              <Button
                title="+ Guardar Valor"
                variant="secondary"
                onPress={() => {
                  setSelectedGoalId(item.id);
                  setProgressModalVisible(true);
                }}
                style={styles.contributeButton}
              />
            </View>
          );
        }}
      />

      {/* Modal Criar Meta */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nova Meta</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.closeText}>Fechar</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 20 }}>
              <Input
                label="Título da Meta"
                placeholder="Ex: Viagem de Férias para Portugal"
                value={title}
                onChangeText={setTitle}
              />

              <Input
                label="Valor Alvo (R$)"
                placeholder="Ex: 15.000,00"
                keyboardType="decimal-pad"
                value={targetAmount}
                onChangeText={setTargetAmount}
              />

              <Input
                label="Valor Já Guardado (R$)"
                placeholder="0,00"
                keyboardType="decimal-pad"
                value={currentAmount}
                onChangeText={setCurrentAmount}
              />

              <Text style={styles.fieldLabel}>Escopo da Meta</Text>
              <View style={styles.scopeSelector}>
                <TouchableOpacity
                  style={[
                    styles.scopeOption,
                    scope === RecordScope.SHARED && styles.scopeOptionActive,
                  ]}
                  onPress={() => setScope(RecordScope.SHARED)}
                >
                  <Text style={styles.scopeEmoji}>🏠</Text>
                  <Text
                    style={[
                      styles.scopeOptionText,
                      scope === RecordScope.SHARED && styles.scopeOptionTextActive,
                    ]}
                  >
                    Meta Compartilhada
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.scopeOption,
                    scope === RecordScope.PRIVATE && styles.scopeOptionActive,
                  ]}
                  onPress={() => setScope(RecordScope.PRIVATE)}
                >
                  <Text style={styles.scopeEmoji}>🔒</Text>
                  <Text
                    style={[
                      styles.scopeOptionText,
                      scope === RecordScope.PRIVATE && styles.scopeOptionTextActive,
                    ]}
                  >
                    Meta Individual
                  </Text>
                </TouchableOpacity>
              </View>

              <Button
                title="Criar Meta"
                onPress={handleCreate}
                isLoading={isCreating}
                style={{ marginTop: 24, marginBottom: 40 }}
              />
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Modal Adicionar Progresso */}
      <Modal visible={progressModalVisible} animationType="fade" transparent>
        <View style={styles.progressOverlay}>
          <View style={styles.progressDialog}>
            <Text style={styles.modalTitle}>Guardar Dinheiro</Text>
            <Text style={styles.dialogSubtitle}>Quanto você quer adicionar nesta meta?</Text>

            <Input
              label="Valor a Guardar (R$)"
              placeholder="0,00"
              keyboardType="decimal-pad"
              value={amountToAdd}
              onChangeText={setAmountToAdd}
              autoFocus
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <Button
                title="Cancelar"
                variant="ghost"
                onPress={() => setProgressModalVisible(false)}
                style={{ flex: 1 }}
              />
              <Button title="Confirmar" onPress={handleAddProgress} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: Colors.text, fontSize: 24, fontWeight: '800' },
  subtitle: { color: Colors.textSecondary, fontSize: 13, marginTop: 4 },
  addButton: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10 },
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  goalCard: {
    backgroundColor: Colors.surface,
    padding: 18,
    borderRadius: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  goalTitle: { color: Colors.text, fontSize: 17, fontWeight: '700', marginBottom: 6 },
  deleteButton: { padding: 4 },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 14 },
  currentVal: { color: Colors.success, fontSize: 22, fontWeight: '800' },
  targetVal: { color: Colors.textSecondary, fontSize: 14 },
  progressBarBg: {
    height: 8,
    backgroundColor: Colors.surfaceCardBorder,
    borderRadius: 4,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  progressText: { color: Colors.textMuted, fontSize: 12, marginTop: 6, fontWeight: '600' },
  contributeButton: { marginTop: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: { color: Colors.text, fontSize: 18, fontWeight: '700' },
  closeText: { color: Colors.primary, fontSize: 15, fontWeight: '600' },
  fieldLabel: { color: Colors.textSecondary, fontSize: 14, fontWeight: '500', marginBottom: 8 },
  scopeSelector: { flexDirection: 'row', gap: 10 },
  scopeOption: {
    flex: 1,
    backgroundColor: Colors.inputBg,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },
  scopeOptionActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryMuted },
  scopeEmoji: { fontSize: 20, marginBottom: 4 },
  scopeOptionText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
  scopeOptionTextActive: { color: Colors.primary },
  progressOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 24,
  },
  progressDialog: {
    backgroundColor: Colors.surface,
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dialogSubtitle: { color: Colors.textSecondary, fontSize: 14, marginTop: 4, marginBottom: 16 },
});
