import React, { useState } from 'react';
import { Platform, View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  ScrollView,
  Alert, } from 'react-native';
import { Colors } from '../../src/theme/colors';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { ScopeBadge } from '../../src/components/ScopeBadge';
import { LoadingState } from '../../src/components/LoadingState';
import { EmptyState } from '../../src/components/EmptyState';
import { useGoals } from '../../src/hooks/useGoals';
import { useTheme } from '../../src/theme/ThemeContext';
import { AppHeader } from '../../src/components/AppHeader';
import { formatCurrency, formatDate } from '../../src/utils/format';
import { RecordScope, GoalStatus, GoalDto } from '../../../packages/shared/src';

export default function GoalsScreen() {
  const { theme, isDark } = useTheme();
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [progressModalVisible, setProgressModalVisible] = useState(false);

  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [editingGoal, setEditingGoal] = useState<GoalDto | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [scope, setScope] = useState<RecordScope>(RecordScope.PRIVATE);
  const [targetDate, setTargetDate] = useState('');
  const [amountToAdd, setAmountToAdd] = useState('');

  const {
    goals,
    isLoading,
    createGoal,
    isCreating,
    updateGoal,
    isUpdating,
    addProgress,
    deleteGoal,
    refetch,
    isRefetching,
  } = useGoals();

  const handleOpenCreate = () => {
    setTitle('');
    setTargetAmount('');
    setCurrentAmount('');
    setScope(RecordScope.PRIVATE);
    setTargetDate('');
    setCreateModalVisible(true);
  };

  const handleOpenEdit = (goal: GoalDto) => {
    setEditingGoal(goal);
    setTitle(goal.title);
    setTargetAmount(Number(goal.targetAmount).toFixed(2).replace('.', ','));
    setCurrentAmount(Number(goal.currentAmount).toFixed(2).replace('.', ','));
    setScope(goal.scope);
    if (goal.targetDate) {
      const d = new Date(goal.targetDate);
      setTargetDate(
        `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
      );
    } else {
      setTargetDate('');
    }
    setEditModalVisible(true);
  };

  const parseDateInput = (str: string) => {
    const parts = str.trim().split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
    return '';
  };

  const handleCreate = async () => {
    const target = parseFloat(targetAmount.replace(',', '.'));
    const current = currentAmount ? parseFloat(currentAmount.replace(',', '.')) : 0;

    if (!title.trim() || isNaN(target) || target <= 0) {
      Alert.alert('Atenção', 'Informe um título e um valor alvo válido.');
      return;
    }

    let isoTargetDate: string | undefined = undefined;
    if (targetDate) {
      const parsed = parseDateInput(targetDate);
      if (parsed) isoTargetDate = new Date(parsed).toISOString();
    }

    try {
      await createGoal({
        title: title.trim(),
        targetAmount: target,
        currentAmount: current,
        scope,
        targetDate: isoTargetDate,
      });
      setCreateModalVisible(false);
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar a meta.');
    }
  };

  const handleUpdate = async () => {
    if (!editingGoal) return;
    const target = parseFloat(targetAmount.replace(',', '.'));
    const current = currentAmount ? parseFloat(currentAmount.replace(',', '.')) : 0;

    if (!title.trim() || isNaN(target) || target <= 0) {
      Alert.alert('Atenção', 'Informe um título e um valor alvo válido.');
      return;
    }

    let isoTargetDate: string | undefined = undefined;
    if (targetDate) {
      const parsed = parseDateInput(targetDate);
      if (parsed) isoTargetDate = new Date(parsed).toISOString();
    }

    try {
      await updateGoal({
        id: editingGoal.id,
        dto: {
          title: title.trim(),
          targetAmount: target,
          currentAmount: current,
          scope,
          targetDate: isoTargetDate,
        },
      });
      setEditModalVisible(false);
      setEditingGoal(null);
    } catch {
      Alert.alert('Erro', 'Não foi possível atualizar a meta.');
    }
  };

  const handleAddProgress = async () => {
    const val = parseFloat(amountToAdd.replace(',', '.'));
    if (!selectedGoalId || isNaN(val) || val <= 0) {
      Alert.alert('Atenção', 'Informe um valor válido a adicionar.');
      return;
    }

    try {
      await addProgress({
        id: selectedGoalId,
        dto: { amountToAdd: val },
      });
      setAmountToAdd('');
      setProgressModalVisible(false);
    } catch {
      Alert.alert('Erro', 'Não foi possível adicionar o progresso.');
    }
  };

  const handleDelete = async (id: string, goalTitle: string) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`Deseja realmente remover a meta "${goalTitle}"?`);
      if (confirmed) {
        try {
          await deleteGoal(id);
          if (editModalVisible) {
            setEditModalVisible(false);
            setEditingGoal(null);
          }
        } catch {
          alert('Não foi possível excluir a meta.');
        }
      }
      return;
    }

    Alert.alert('Excluir Meta', `Deseja realmente remover a meta "${goalTitle}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteGoal(id);
            if (editModalVisible) {
              setEditModalVisible(false);
              setEditingGoal(null);
            }
          } catch {
            Alert.alert('Erro', 'Não foi possível excluir a meta.');
          }
        },
      },
    ]);
  };

  if (isLoading) return <LoadingState />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <AppHeader title="Nexo" subtitle="Metas Financeiras" />
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>Metas Financeiras</Text>
            <Text style={styles.subtitle}>Economias e objetivos compartilhados</Text>
          </View>
          <Button
            title="+ Nova Meta"
            onPress={handleOpenCreate}
            style={styles.addButton}
          />
        </View>
      </View>

      {/* Lista de Metas */}
      <FlatList
        data={goals}
        keyExtractor={(item) => item.id}
        refreshing={isRefetching}
        onRefresh={refetch}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            title="Nenhuma meta cadastrada"
            description="Crie metas para viagens, reservas de emergência ou reformas da casa."
            actionTitle="+ Criar Primeira Meta"
            onAction={handleOpenCreate}
          />
        }
        renderItem={({ item }) => {
          const progressPercent = Math.min(
            100,
            Math.round((Number(item.currentAmount) / Number(item.targetAmount)) * 100) || 0
          );

          return (
            <View style={styles.goalCard}>
              <View style={styles.goalHeader}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.goalTitle}>{item.title}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <ScopeBadge scope={item.scope} />
                    {item.targetDate && (
                      <Text style={styles.dateBadge}>Alvo: {formatDate(item.targetDate)}</Text>
                    )}
                  </View>
                </View>

                <View style={styles.headerActions}>
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => handleOpenEdit(item)}
                  >
                    <Text style={{ fontSize: 15 }}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => handleDelete(item.id, item.title)}
                  >
                    <Text style={{ fontSize: 15 }}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.amountRow}>
                <Text style={styles.currentVal}>{formatCurrency(item.currentAmount)}</Text>
                <Text style={styles.targetVal}>de {formatCurrency(item.targetAmount)}</Text>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
              </View>
              <Text style={styles.progressText}>{progressPercent}% atingido</Text>

              <View style={styles.cardBottomRow}>
                <Button
                  title="+ Guardar Valor"
                  variant="secondary"
                  onPress={() => {
                    setSelectedGoalId(item.id);
                    setProgressModalVisible(true);
                  }}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Editar"
                  variant="ghost"
                  onPress={() => handleOpenEdit(item)}
                  style={{ paddingHorizontal: 16 }}
                />
              </View>
            </View>
          );
        }}
      />

      {/* FAB FLUTUANTE NA ZONA DO POLEGAR */}
      <TouchableOpacity
        style={[styles.fabButton, { backgroundColor: theme.primary }, theme.fabShadow]}
        onPress={handleOpenCreate}
        activeOpacity={0.85}
      >
        <Text style={styles.fabIcon}>＋</Text>
        <Text style={styles.fabText}>Nova Meta</Text>
      </TouchableOpacity>

      {/* Modal Criar Meta */}
      <Modal visible={createModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nova Meta</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <Text style={styles.closeText}>Fechar</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 20 }}>
              <Input
                label="Título da Meta"
                placeholder="Ex: Viagem para Itália"
                value={title}
                onChangeText={setTitle}
              />

              <Input
                label="Valor Alvo (R$)"
                placeholder="Ex: 10.000,00"
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

              <Input
                label="Data Alvo (Opcional - DD/MM/AAAA)"
                placeholder="Ex: 31/12/2026"
                value={targetDate}
                onChangeText={setTargetDate}
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

      {/* Modal Editar Meta */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar Meta</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Text style={styles.closeText}>Fechar</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 20 }}>
              <Input
                label="Título da Meta"
                placeholder="Ex: Viagem para Itália"
                value={title}
                onChangeText={setTitle}
              />

              <Input
                label="Valor Alvo (R$)"
                placeholder="Ex: 10.000,00"
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

              <Input
                label="Data Alvo (DD/MM/AAAA)"
                placeholder="Ex: 31/12/2026"
                value={targetDate}
                onChangeText={setTargetDate}
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

              <View style={{ marginTop: 24, gap: 12, marginBottom: 40 }}>
                <Button
                  title="Salvar Alterações"
                  onPress={handleUpdate}
                  isLoading={isUpdating}
                />
                {editingGoal && (
                  <Button
                    title="Excluir Meta"
                    variant="ghost"
                    onPress={() => handleDelete(editingGoal.id, editingGoal.title)}
                    style={{ borderColor: Colors.danger, borderWidth: 1 }}
                  />
                )}
              </View>
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
  fabButton: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 28,
    gap: 8,
  },
  fabIcon: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  fabShadow: {
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },

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
  headerActions: { flexDirection: 'row', gap: 6 },
  iconBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },
  dateBadge: {
    color: Colors.textMuted,
    fontSize: 12,
  },
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
  cardBottomRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
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
