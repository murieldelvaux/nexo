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
import { useTasks } from '../../src/hooks/useTasks';
import { formatDate } from '../../src/utils/format';
import { RecordScope, TaskDto } from '../../../packages/shared/src';

export default function TasksScreen() {
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskDto | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [dueDateStr, setDueDateStr] = useState('');
  const [scope, setScope] = useState<RecordScope>(RecordScope.PRIVATE);

  const {
    tasks,
    isLoading,
    createTask,
    isCreating,
    updateTask,
    isUpdating,
    toggleTask,
    deleteTask,
    refetch,
    isRefetching,
  } = useTasks();

  const handleOpenCreate = () => {
    setTitle('');
    setDueDateStr('');
    setScope(RecordScope.PRIVATE);
    setCreateModalVisible(true);
  };

  const handleOpenEdit = (task: TaskDto) => {
    setEditingTask(task);
    setTitle(task.title);
    setScope(task.scope);
    if (task.dueDate) {
      const d = new Date(task.dueDate);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      setDueDateStr(`${day}/${month}/${year} ${hours}:${mins}`);
    } else {
      setDueDateStr('');
    }
    setEditModalVisible(true);
  };

  const parseDateTimeInput = (str: string) => {
    const trimmed = str.trim();
    if (!trimmed) return undefined;

    // Format: DD/MM/AAAA or DD/MM/AAAA HH:mm
    const parts = trimmed.split(' ');
    const dateParts = parts[0].split('/');
    if (dateParts.length !== 3) return undefined;

    const day = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1;
    const year = parseInt(dateParts[2], 10);

    let hours = 8;
    let minutes = 0;

    if (parts.length > 1) {
      const timeParts = parts[1].split(':');
      if (timeParts.length >= 2) {
        hours = parseInt(timeParts[0], 10);
        minutes = parseInt(timeParts[1], 10);
      }
    }

    const d = new Date(year, month, day, hours, minutes, 0);
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Atenção', 'Informe o título do lembrete.');
      return;
    }

    let isoDue: string | undefined = undefined;
    if (dueDateStr.trim()) {
      isoDue = parseDateTimeInput(dueDateStr);
      if (!isoDue) {
        Alert.alert('Data Inválida', 'Use o formato DD/MM/AAAA ou DD/MM/AAAA HH:MM');
        return;
      }
    }

    try {
      await createTask({
        title: title.trim(),
        dueDate: isoDue,
        scope,
      });
      setCreateModalVisible(false);
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar o lembrete.');
    }
  };

  const handleUpdate = async () => {
    if (!editingTask) return;
    if (!title.trim()) {
      Alert.alert('Atenção', 'Informe o título do lembrete.');
      return;
    }

    let isoDue: string | undefined = undefined;
    if (dueDateStr.trim()) {
      isoDue = parseDateTimeInput(dueDateStr);
      if (!isoDue) {
        Alert.alert('Data Inválida', 'Use o formato DD/MM/AAAA ou DD/MM/AAAA HH:MM');
        return;
      }
    }

    try {
      await updateTask({
        id: editingTask.id,
        dto: {
          title: title.trim(),
          dueDate: isoDue,
          scope,
        },
      });
      setEditModalVisible(false);
      setEditingTask(null);
    } catch {
      Alert.alert('Erro', 'Não foi possível atualizar o lembrete.');
    }
  };

  const handleDelete = async (id: string, taskTitle: string) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`Deseja realmente remover "${taskTitle}"?`);
      if (confirmed) {
        try {
          await deleteTask(id);
          if (editModalVisible) {
            setEditModalVisible(false);
            setEditingTask(null);
          }
        } catch {
          alert('Não foi possível excluir o lembrete.');
        }
      }
      return;
    }

    Alert.alert('Excluir Lembrete', `Deseja realmente remover "${taskTitle}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTask(id);
            if (editModalVisible) {
              setEditModalVisible(false);
              setEditingTask(null);
            }
          } catch {
            Alert.alert('Erro', 'Não foi possível excluir o lembrete.');
          }
        },
      },
    ]);
  };

  if (isLoading) return <LoadingState />;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Rotina & Lembretes</Text>
          <Button
            title="+ Novo Item"
            onPress={handleOpenCreate}
            style={styles.addButton}
          />
        </View>
        <Text style={styles.subtitle}>
          Contas a pagar, compras de mercado e tarefas compartilhadas.
        </Text>
      </View>

      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        refreshing={isRefetching}
        onRefresh={refetch}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            title="Nenhum lembrete pendente"
            description="Mande um WhatsApp como 'Lembrar de pagar condomínio dia 10' ou crie aqui."
            actionTitle="+ Criar Lembrete"
            onAction={handleOpenCreate}
          />
        }
        renderItem={({ item }) => (
          <View style={[styles.taskCard, item.isCompleted && styles.taskCardCompleted]}>
            {/* Checkbox */}
            <TouchableOpacity
              style={[styles.checkbox, item.isCompleted && styles.checkboxChecked]}
              onPress={() => toggleTask(item.id)}
            >
              {item.isCompleted && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={{ flex: 1 }}
              activeOpacity={0.8}
              onPress={() => toggleTask(item.id)}
            >
              <Text
                style={[
                  styles.taskTitle,
                  item.isCompleted && styles.taskTitleCompleted,
                ]}
              >
                {item.title}
              </Text>
              <View style={styles.metaRow}>
                {item.dueDate && (
                  <Text style={styles.dueDateText}>🗓️ {formatDate(item.dueDate)}</Text>
                )}
                <ScopeBadge scope={item.scope} />
              </View>
            </TouchableOpacity>

            {/* Ações */}
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => handleOpenEdit(item)}
              >
                <Text style={{ fontSize: 14 }}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => handleDelete(item.id, item.title)}
              >
                <Text style={{ fontSize: 14 }}>🗑️</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* Modal Criar Tarefa */}
      <Modal visible={createModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Novo Lembrete</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <Text style={styles.closeText}>Fechar</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 20 }}>
              <Input
                label="O que precisa ser feito ou lembrado?"
                placeholder="Ex: Pagar fatura de energia"
                value={title}
                onChangeText={setTitle}
                autoFocus
              />

              <Input
                label="Data e Horário (Opcional)"
                placeholder="Ex: 30/10/2026 ou 30/10/2026 15:00"
                value={dueDateStr}
                onChangeText={setDueDateStr}
              />

              <Text style={styles.fieldLabel}>Escopo do Lembrete</Text>
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
                    Lembrete da Casa
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
                    Lembrete Privado
                  </Text>
                </TouchableOpacity>
              </View>

              <Button
                title="Salvar Lembrete"
                onPress={handleCreate}
                isLoading={isCreating}
                style={{ marginTop: 24, marginBottom: 40 }}
              />
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Modal Editar Tarefa */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar Lembrete</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Text style={styles.closeText}>Fechar</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 20 }}>
              <Input
                label="Título do Lembrete"
                placeholder="Ex: Pagar fatura"
                value={title}
                onChangeText={setTitle}
              />

              <Input
                label="Data e Horário (DD/MM/AAAA ou DD/MM/AAAA HH:MM)"
                placeholder="Ex: 30/10/2026 15:00"
                value={dueDateStr}
                onChangeText={setDueDateStr}
              />

              <Text style={styles.fieldLabel}>Escopo do Lembrete</Text>
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
                    Lembrete da Casa
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
                    Lembrete Privado
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={{ marginTop: 24, gap: 12, marginBottom: 40 }}>
                <Button
                  title="Salvar Alterações"
                  onPress={handleUpdate}
                  isLoading={isUpdating}
                />
                {editingTask && (
                  <Button
                    title="Excluir Lembrete"
                    variant="ghost"
                    onPress={() => handleDelete(editingTask.id, editingTask.title)}
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
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: Colors.text, fontSize: 24, fontWeight: '800' },
  subtitle: { color: Colors.textSecondary, fontSize: 13, marginTop: 4 },
  addButton: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10 },
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  taskCardCompleted: { opacity: 0.6 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkmark: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  taskTitle: { color: Colors.text, fontSize: 16, fontWeight: '600' },
  taskTitleCompleted: { textDecorationLine: 'line-through', color: Colors.textSecondary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  dueDateText: { color: Colors.textMuted, fontSize: 12 },
  cardActions: { flexDirection: 'row', gap: 6 },
  iconBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
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
});
