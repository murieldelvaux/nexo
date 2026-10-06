import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../src/theme/colors';
import { Card } from '../../src/components/Card';
import { ScopeBadge } from '../../src/components/ScopeBadge';
import { LoadingState } from '../../src/components/LoadingState';
import { ErrorState } from '../../src/components/ErrorState';
import { EmptyState } from '../../src/components/EmptyState';
import { useExpenses } from '../../src/hooks/useExpenses';
import { useAuth } from '../../src/hooks/useAuth';
import { useHousehold } from '../../src/hooks/useHousehold';
import { formatCurrency, formatDate, getCategoryLabel } from '../../src/utils/format';

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { household } = useHousehold();

  const currentMonth = new Date().toISOString().slice(0, 7);
  const [activeScope, setActiveScope] = useState<'ALL' | 'SHARED' | 'PRIVATE'>('ALL');

  const { expenses, summary, isLoading, isError, refetch, isRefetching } = useExpenses({
    month: currentMonth,
    scope: activeScope,
  });

  if (isLoading) {
    return <LoadingState message="Carregando visão consolidada..." />;
  }

  if (isError) {
    return <ErrorState onRetry={refetch} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.householdName}>
              {household?.name ? `🏠 ${household.name}` : '👤 Espaço Pessoal'}
            </Text>
            <Text style={styles.greeting}>Olá, {user?.name || 'Nexo'}</Text>
          </View>
          <TouchableOpacity
            style={styles.whatsAppBadge}
            onPress={() => router.push('/(tabs)/settings')}
          >
            <Text style={styles.whatsAppBadgeText}>💬 WhatsApp Conectado</Text>
          </TouchableOpacity>
        </View>

        {/* Cards de Resumo */}
        <View style={styles.cardsRow}>
          <Card style={styles.summaryCard} variant="bordered">
            <Text style={styles.cardLabel}>Gastos da Casa</Text>
            <Text style={styles.cardValue}>{formatCurrency(summary.totalShared)}</Text>
            <Text style={styles.cardSub}>
              Sua parte (50%): {formatCurrency(summary.userShareOfShared)}
            </Text>
          </Card>

          <Card style={styles.summaryCard} variant="bordered">
            <Text style={styles.cardLabel}>Meus Gastos</Text>
            <Text style={styles.cardValue}>{formatCurrency(summary.totalPrivate)}</Text>
            <Text style={styles.cardSubPrivate}>🔒 Privado</Text>
          </Card>
        </View>
      </View>

      {/* Filtro de Escopo */}
      <View style={styles.filterContainer}>
        {(
          [
            { id: 'ALL', label: 'Tudo' },
            { id: 'SHARED', label: '🏠 Compartilhado' },
            { id: 'PRIVATE', label: '🔒 Privado' },
          ] as const
        ).map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.filterChip, activeScope === item.id && styles.filterChipActive]}
            onPress={() => setActiveScope(item.id)}
          >
            <Text
              style={[
                styles.filterText,
                activeScope === item.id && styles.filterTextActive,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Lista de Atividades Recentes */}
      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />
        }
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>Últimos Lançamentos</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/expenses')}>
              <Text style={styles.sectionLink}>Ver todos</Text>
            </TouchableOpacity>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="Nenhum gasto neste filtro"
            description="Mande uma mensagem no WhatsApp como 'Gastei 40 no mercado' ou registre manualmente."
            actionTitle="Novo Gasto Manual"
            onAction={() => router.push('/(tabs)/expenses')}
          />
        }
        renderItem={({ item }) => (
          <View style={styles.expenseItem}>
            <View style={styles.expenseLeft}>
              <Text style={styles.expenseDesc}>{item.description}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.expenseMeta}>
                  {getCategoryLabel(item.category)} • {formatDate(item.date)}
                </Text>
                <ScopeBadge scope={item.scope} authorName={item.author?.name} />
              </View>
            </View>
            <View style={styles.expenseRight}>
              <Text style={styles.expenseAmount}>{formatCurrency(item.amount)}</Text>
            </View>
          </View>
        )}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  householdName: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  greeting: {
    color: Colors.text,
    fontSize: 26,
    fontWeight: '800',
    marginTop: 2,
  },
  whatsAppBadge: {
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(48, 209, 88, 0.3)',
  },
  whatsAppBadgeText: {
    color: Colors.success,
    fontSize: 11,
    fontWeight: '700',
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    padding: 14,
  },
  cardLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  cardValue: {
    color: Colors.text,
    fontSize: 19,
    fontWeight: '800',
    marginTop: 4,
  },
  cardSub: {
    color: Colors.primary,
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
  cardSubPrivate: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#FFF',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 14,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  sectionLink: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  expenseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  expenseLeft: {
    flex: 1,
    marginRight: 12,
  },
  expenseDesc: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  expenseMeta: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  expenseRight: {
    alignItems: 'flex-end',
  },
  expenseAmount: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
});
