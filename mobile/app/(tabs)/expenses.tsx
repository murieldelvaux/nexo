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
import { CalendarRangePickerModal } from '../../src/components/CalendarRangePickerModal';
import { useTheme } from '../../src/theme/ThemeContext';
import { AppHeader } from '../../src/components/AppHeader';
import { useExpenses } from '../../src/hooks/useExpenses';
import { formatCurrency, formatDate, getCategoryLabel } from '../../src/utils/format';
import { ExpenseCategory, RecordScope, ExpenseDto } from '../../../packages/shared/src';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function ExpensesScreen() {
  const { theme, isDark } = useTheme();
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1); // 1-12
  const [filterMode, setFilterMode] = useState<'MONTH' | 'PERIOD'>('MONTH');

  // Custom period states (DD/MM/AAAA)
  const [periodStartDate, setPeriodStartDate] = useState('');
  const [periodEndDate, setPeriodEndDate] = useState('');
  const [appliedPeriod, setAppliedPeriod] = useState<{ start?: string; end?: string }>({});
  const [calendarPickerVisible, setCalendarPickerVisible] = useState(false);

  const [activeScope, setActiveScope] = useState<'ALL' | 'SHARED' | 'PRIVATE'>('ALL');

  // Modals
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseDto | null>(null);

  // Form State (Create / Edit)
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>(ExpenseCategory.FOOD_MARKET);
  const [scope, setScope] = useState<RecordScope>(RecordScope.PRIVATE);
  const [customDate, setCustomDate] = useState('');

  // Format month string "YYYY-MM"
  const currentMonthStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

  const {
    expenses,
    summary,
    isLoading,
    createExpense,
    isCreating,
    updateExpense,
    isUpdating,
    deleteExpense,
    refetch,
    isRefetching,
  } = useExpenses({
    ...(filterMode === 'MONTH'
      ? { month: currentMonthStr }
      : {
          startDate: appliedPeriod.start,
          endDate: appliedPeriod.end,
        }),
    scope: activeScope,
  });

  // Navigation handlers for month
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    setSelectedYear(now.getFullYear());
    setSelectedMonth(now.getMonth() + 1);
  };

  // Convert DD/MM/AAAA to ISO or YYYY-MM-DD
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

  const handleApplyPeriod = () => {
    const startIso = periodStartDate ? parseDateInput(periodStartDate) : undefined;
    const endIso = periodEndDate ? parseDateInput(periodEndDate) : undefined;

    if (periodStartDate && !startIso) {
      Alert.alert('Data Inválida', 'Preencha a data inicial no formato DD/MM/AAAA (ex: 01/10/2026)');
      return;
    }
    if (periodEndDate && !endIso) {
      Alert.alert('Data Inválida', 'Preencha a data final no formato DD/MM/AAAA (ex: 31/10/2026)');
      return;
    }

    setAppliedPeriod({ start: startIso, end: endIso });
  };

  const handleClearPeriod = () => {
    setPeriodStartDate('');
    setPeriodEndDate('');
    setAppliedPeriod({});
  };

  // Open Create
  const handleOpenCreate = () => {
    setDescription('');
    setAmount('');
    setCategory(ExpenseCategory.FOOD_MARKET);
    setScope(RecordScope.PRIVATE);
    setCustomDate('');
    setCreateModalVisible(true);
  };

  // Open Edit
  const handleOpenEdit = (item: ExpenseDto) => {
    setEditingExpense(item);
    setDescription(item.description);
    setAmount(Number(item.amount).toFixed(2).replace('.', ','));
    setCategory(item.category);
    setScope(item.scope);
    const d = new Date(item.date);
    const formattedD = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    setCustomDate(formattedD);
    setEditModalVisible(true);
  };

  // Submit Create
  const handleCreate = async () => {
    const numAmount = parseFloat(amount.replace(',', '.'));
    if (!description.trim() || isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Atenção', 'Informe uma descrição e um valor válido maior que zero.');
      return;
    }

    let isoDate: string | undefined = undefined;
    if (customDate) {
      const parsed = parseDateInput(customDate);
      if (parsed) isoDate = new Date(parsed).toISOString();
    }

    try {
      await createExpense({
        description: description.trim(),
        amount: numAmount,
        category,
        scope,
        date: isoDate,
      });
      setCreateModalVisible(false);
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar o gasto.');
    }
  };

  // Submit Edit
  const handleUpdate = async () => {
    if (!editingExpense) return;
    const numAmount = parseFloat(amount.replace(',', '.'));
    if (!description.trim() || isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Atenção', 'Informe uma descrição e um valor válido maior que zero.');
      return;
    }

    let isoDate: string | undefined = undefined;
    if (customDate) {
      const parsed = parseDateInput(customDate);
      if (parsed) isoDate = new Date(parsed).toISOString();
    }

    try {
      await updateExpense({
        id: editingExpense.id,
        dto: {
          description: description.trim(),
          amount: numAmount,
          category,
          scope,
          ...(isoDate && { date: isoDate }),
        },
      });
      setEditModalVisible(false);
      setEditingExpense(null);
    } catch {
      Alert.alert('Erro', 'Não foi possível atualizar o gasto.');
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`Deseja realmente excluir "${title}"?`);
      if (confirmed) {
        try {
          await deleteExpense(id);
          if (editModalVisible) {
            setEditModalVisible(false);
            setEditingExpense(null);
          }
        } catch {
          alert('Não foi possível excluir o gasto.');
        }
      }
      return;
    }

    Alert.alert('Excluir Gasto', `Deseja realmente excluir "${title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteExpense(id);
            if (editModalVisible) {
              setEditModalVisible(false);
              setEditingExpense(null);
            }
          } catch {
            Alert.alert('Erro', 'Não foi possível excluir o gasto.');
          }
        },
      },
    ]);
  };

  if (isLoading) return <LoadingState />;

  const isCurrentMonthActive =
    selectedYear === today.getFullYear() && selectedMonth === today.getMonth() + 1;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <AppHeader title="Nexo" subtitle="Gastos & Extrato" />
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Gastos & Extrato</Text>
          <Button
            title="+ Novo Gasto"
            onPress={handleOpenCreate}
            style={styles.addButton}
          />
        </View>

        {/* Totais */}
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

      {/* Alternador de Modo de Filtro (Mês vs Período) */}
      <View style={styles.timeFilterBar}>
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeButton, filterMode === 'MONTH' && styles.modeButtonActive]}
            onPress={() => setFilterMode('MONTH')}
          >
            <Text style={[styles.modeText, filterMode === 'MONTH' && styles.modeTextActive]}>
              📅 Por Mês
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, filterMode === 'PERIOD' && styles.modeButtonActive]}
            onPress={() => setFilterMode('PERIOD')}
          >
            <Text style={[styles.modeText, filterMode === 'PERIOD' && styles.modeTextActive]}>
              📆 Período (Dia/Mês/Ano)
            </Text>
          </TouchableOpacity>
        </View>

        {filterMode === 'MONTH' ? (
          <View style={styles.monthSelector}>
            <TouchableOpacity onPress={handlePrevMonth} style={styles.monthNavBtn}>
              <Text style={styles.monthNavText}>◀</Text>
            </TouchableOpacity>

            <View style={styles.monthLabelContainer}>
              <Text style={styles.monthLabel}>
                {MONTH_NAMES[selectedMonth - 1]} de {selectedYear}
              </Text>
              {!isCurrentMonthActive && (
                <TouchableOpacity onPress={handleCurrentMonth} style={styles.currentMonthBadge}>
                  <Text style={styles.currentMonthBadgeText}>Mês Atual</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity onPress={handleNextMonth} style={styles.monthNavBtn}>
              <Text style={styles.monthNavText}>▶</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.periodForm}>
            <TouchableOpacity
              style={styles.calendarTriggerCard}
              onPress={() => setCalendarPickerVisible(true)}
              activeOpacity={0.8}
            >
              <View style={styles.calendarTriggerLeft}>
                <Text style={styles.calendarIcon}>📅</Text>
                <View>
                  <Text style={styles.calendarTriggerLabel}>Período Personalizado</Text>
                  <Text style={styles.calendarTriggerValue}>
                    {periodStartDate && periodEndDate
                      ? `${periodStartDate} até ${periodEndDate}`
                      : periodStartDate
                      ? `A partir de ${periodStartDate}`
                      : 'Toque para selecionar no calendário'}
                  </Text>
                </View>
              </View>
              <View style={styles.calendarOpenBadge}>
                <Text style={styles.calendarOpenBadgeText}>Abrir ▾</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.periodActions}>
              <Button
                title="Abrir Calendário"
                onPress={() => setCalendarPickerVisible(true)}
                style={{ flex: 1, height: 40 }}
              />
              {(appliedPeriod.start || appliedPeriod.end || periodStartDate || periodEndDate) && (
                <Button
                  title="Limpar"
                  variant="ghost"
                  onPress={handleClearPeriod}
                  style={{ height: 40 }}
                />
              )}
            </View>
          </View>
        )}
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
            description={
              filterMode === 'MONTH'
                ? `Não há lançamentos em ${MONTH_NAMES[selectedMonth - 1]} de ${selectedYear}.`
                : 'Não há lançamentos no período informado.'
            }
            actionTitle="+ Registrar Gasto"
            onAction={handleOpenCreate}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => handleOpenEdit(item)}
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

            <View style={styles.cardRight}>
              <Text style={styles.cardAmount}>{formatCurrency(item.amount)}</Text>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.actionIconBtn}
                  onPress={() => handleOpenEdit(item)}
                >
                  <Text style={styles.actionIcon}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionIconBtn}
                  onPress={() => handleDelete(item.id, item.description)}
                >
                  <Text style={styles.actionIcon}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* FAB FLUTUANTE NA ZONA DO POLEGAR */}
      <TouchableOpacity
        style={[styles.fabButton, { backgroundColor: theme.primary }, theme.fabShadow]}
        onPress={handleOpenCreate}
        activeOpacity={0.85}
      >
        <Text style={styles.fabIcon}>＋</Text>
        <Text style={styles.fabText}>Novo Gasto</Text>
      </TouchableOpacity>

      {/* Modal de Calendário MUI */}
      <CalendarRangePickerModal
        visible={calendarPickerVisible}
        onClose={() => setCalendarPickerVisible(false)}
        initialStartDate={periodStartDate}
        initialEndDate={periodEndDate}
        onApply={(s, e) => {
          setPeriodStartDate(s);
          setPeriodEndDate(e);
          const startIso = parseDateInput(s);
          const endIso = parseDateInput(e);
          setAppliedPeriod({ start: startIso, end: endIso });
        }}
        onClear={() => {
          handleClearPeriod();
        }}
      />

      {/* Modal de Criação */}
      <Modal visible={createModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Novo Lançamento</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
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

              <Input
                label="Data (Opcional - DD/MM/AAAA)"
                placeholder="Deixe em branco para hoje"
                value={customDate}
                onChangeText={setCustomDate}
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

      {/* Modal de Edição */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar Gasto</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Text style={styles.closeText}>Fechar</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 20 }}>
              <Input
                label="Descrição"
                placeholder="Ex: Supermercado"
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

              <Input
                label="Data (DD/MM/AAAA)"
                placeholder="Ex: 06/10/2026"
                value={customDate}
                onChangeText={setCustomDate}
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

              <View style={{ marginTop: 24, gap: 12, marginBottom: 40 }}>
                <Button
                  title="Salvar Alterações"
                  onPress={handleUpdate}
                  isLoading={isUpdating}
                />
                {editingExpense && (
                  <Button
                    title="Excluir Gasto"
                    variant="ghost"
                    onPress={() => handleDelete(editingExpense.id, editingExpense.description)}
                    style={{ borderColor: Colors.danger, borderWidth: 1 }}
                  />
                )}
              </View>
            </ScrollView>
          </SafeAreaView>
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

  // Time filter styles
  timeFilterBar: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 9,
  },
  modeButtonActive: {
    backgroundColor: Colors.primary,
  },
  modeText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  modeTextActive: {
    color: '#FFF',
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  monthNavBtn: {
    padding: 8,
  },
  monthNavText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '800',
  },
  monthLabelContainer: {
    alignItems: 'center',
  },
  monthLabel: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  currentMonthBadge: {
    marginTop: 2,
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  currentMonthBadgeText: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  calendarTriggerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceCard,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
  },
  calendarTriggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  calendarIcon: {
    fontSize: 22,
  },
  calendarTriggerLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  calendarTriggerValue: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  calendarOpenBadge: {
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(10, 132, 255, 0.3)',
  },
  calendarOpenBadgeText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  periodForm: {
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  periodInputsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  periodActions: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginTop: 8,
  },

  // Scope chips
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
  cardRight: { alignItems: 'flex-end', justifyContent: 'space-between', height: 60 },
  cardAmount: { color: Colors.text, fontSize: 16, fontWeight: '800' },
  cardActions: { flexDirection: 'row', gap: 6, marginTop: 6 },
  actionIconBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },
  actionIcon: { fontSize: 14 },
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
