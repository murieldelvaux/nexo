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
import { useTasks } from '../../src/hooks/useTasks';
import { formatDate } from '../../src/utils/format';
import { RecordScope } from '../../../packages/shared/src';

export default function TasksScreen() {
  const { tasks, isLoading, createTask, isCreating, toggleTask, deleteTask, refetch, isRefetching } =
    useTasks();

  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [scope, setScope] = useState<RecordScope>(RecordScope.SHARED);

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Atenção', 'Informe o título do lembrete.');
      return;
    }

    try {
      await createTask({
        title: title.trim(),
        scope,
      });
      setTitle('');
      setModalVisible(false);
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar o lembrete.');
    }
  };

  const handleDelete = (id: string, taskTitle: string) => {
    Alert.alert('Excluir Lembrete', `Deseja remover "${taskTitle}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteTask(id) },
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
            onPress={() => setModalVisible(true)}
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
            description="Mande um WhatsApp como 'Lembrar de pagar condomínio' ou cadastre manualmente."
            actionTitle="+ Criar Lembrete"
            onAction={() => setModalVisible(true)}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.taskCard, item.isCompleted && styles.taskCardCompleted]}
            activeOpacity={0.7}
            onPress={() => toggleTask(item.id)}
            onLongPress={() => handleDelete(item.id, item.title)}
          >
            {/* Checkbox */}
            <View style={[styles.checkbox, item.isCompleted && styles.checkboxChecked]}>
              {item.isCompleted && <Text style={styles.checkmark}>✓</Text>}
            </View>

            <View style={{ flex: 1 }}>
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
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Modal Criar Tarefa */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Novo Lembrete</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.closeText}>Fechar</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 20 }}>
              <Input
                label="O que precisa ser feito ou lembrado?"
                placeholder="Ex: Pagar fatura da Enel dia 10"
                value={title}
                onChangeText={setTitle}
                autoFocus
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
    gap: 14,
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
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
