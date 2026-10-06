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
import { useExpenses } from '../../src/hooks/useExpenses';
import { formatCurrency, formatDate, getCategoryLabel } from '../../src/utils/format';
import { ExpenseCategory, RecordScope } from '../../../packages/shared/src';

export default function ExpensesScreen() {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [activeScope, setActiveScope] = useState<'ALL' | 'SHARED' | 'PRIVATE'>('ALL');
  const [modalVisible, setModalVisible] = useState(false);

  // Form State
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>(ExpenseCategory.FOOD_MARKET);
  const [scope, setScope] = useState<RecordScope>(RecordScope.SHARED);

  const {
    expenses,
    summary,
    isLoading,
    createExpense,
    isCreating,
    deleteExpense,
    refetch,
    isRefetching,
  } = useExpenses({
    month: currentMonth,
    scope: activeScope,
  });

  const handleCreate = async () => {
    const numAmount = parseFloat(amount.replace(',', '.'));
    if (!description.trim() || isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Atenção', 'Informe uma descrição e um valor válido maior que zero.');
      return;
    }

    try {
      await createExpense({
        description: description.trim(),
        amount: numAmount,
        category,
        scope,
      });
      setDescription('');
      setAmount('');
      setModalVisible(false);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar o gasto.');
    }
  };

  const handleDelete = (id: string, title: string) => {
    Alert.alert('Excluir Gasto', `Deseja remover "${title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteExpense(id) },
    ]);
  };

  if (isLoading) return <LoadingState />;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Gastos & Extrato</Text>
          <Button
            title="+ Novo Gasto"
            onPress={() => setModalVisible(true)}
            style={styles.addButton}
          />
        </View>

        {/* Totais do Mês */}
        <View style={styles.summaryBar}>
          <View>
            <Text style={styles.summaryLabel}>Total Compartilhado</Text>
            <Text style={styles.summaryValue}>{formatCurrency(summary.totalShared)}</Text>
          </View>
          <View style={styles.divider} />
          <View>
            <Text style={styles.summaryLabel}>Total Privado</Text>
            <Text style={styles.summaryValue}>{formatCurrency(summary.totalPrivate)}</Text>
          </View>
        </View>
      </View>

      {/* Seletor de Escopo */}
      <View style={styles.filterContainer}>
        {(['ALL', 'SHARED', 'PRIVATE'] as const).map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.chip, activeScope === s && styles.chipActive]}
            onPress={() => setActiveScope(s)}
          >
            <Text style={[styles.chipText, activeScope === s && styles.chipTextActive]}>
              {s === 'ALL' ? 'Todos' : s === 'SHARED' ? '🏠 Compartilhados' : '🔒 Privados'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Lista de Gastos */}
      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        refreshing={isRefetching}
        onRefresh={refetch}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            title="Nenhum gasto encontrado"
            description="Cadastre gastos pelo botão acima ou mande mensagens pelo WhatsApp."
            actionTitle="+ Criar Gasto Manual"
            onAction={() => setModalVisible(true)}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.7}
            onLongPress={() => handleDelete(item.id, item.description)}
          >
            <View style={styles.cardLeft}>
              <Text style={styles.cardDesc}>{item.description}</Text>
              <Text style={styles.cardCategory}>{getCategoryLabel(item.category)}</Text>
              <View style={styles.cardFooter}>
                <Text style={styles.cardDate}>
                  {formatDate(item.date)} • Por {item.author?.name}
                </Text>
                <ScopeBadge scope={item.scope} />
              </View>
            </View>
            <Text style={styles.cardAmount}>{formatCurrency(item.amount)}</Text>
          </TouchableOpacity>
        )}
      />

      {/* Modal de Criação Manual */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Novo Lançamento</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.closeText}>Fechar</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 20 }}>
              <Input
                label="Descrição"
                placeholder="Ex: Supermercado Pão de Açúcar"
                value={description}
                onChangeText={setDescription}
              />

              <Input
                label="Valor (R$)"
                placeholder="0,00"
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
              />

              <Text style={styles.fieldLabel}>Escopo do Gasto</Text>
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
                    Compartilhado
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
                    Privado (Individual)
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Categoria</Text>
              <View style={styles.categoryGrid}>
                {Object.values(ExpenseCategory).map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.catChip,
                      category === cat && styles.catChipActive,
                    ]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.catText,
                        category === cat && styles.catTextActive,
                      ]}
                    >
                      {getCategoryLabel(cat)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Button
                title="Salvar Gasto"
                onPress={handleCreate}
                isLoading={isCreating}
                style={{ marginTop: 24, marginBottom: 40 }}
              />
            </ScrollView>
          </SafeAreaView>
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
  addButton: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10 },
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryLabel: { color: Colors.textSecondary, fontSize: 12 },
  summaryValue: { color: Colors.text, fontSize: 17, fontWeight: '700', marginTop: 2 },
  divider: { width: 1, backgroundColor: Colors.border },
  filterContainer: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 12 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#FFF' },
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardLeft: { flex: 1, marginRight: 12 },
  cardDesc: { color: Colors.text, fontSize: 16, fontWeight: '700' },
  cardCategory: { color: Colors.textSecondary, fontSize: 13, marginTop: 2 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  cardDate: { color: Colors.textMuted, fontSize: 12 },
  cardAmount: { color: Colors.text, fontSize: 16, fontWeight: '800' },
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
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },
  catChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '500' },
  catTextActive: { color: '#FFF' },
});
