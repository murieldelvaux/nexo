export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  expenses: {
    all: ['expenses'] as const,
    list: (filters: { month?: string; scope?: string; category?: string }) =>
      ['expenses', 'list', filters] as const,
    detail: (id: string) => ['expenses', 'detail', id] as const,
  },
  goals: {
    all: ['goals'] as const,
    list: () => ['goals', 'list'] as const,
  },
  tasks: {
    all: ['tasks'] as const,
    list: () => ['tasks', 'list'] as const,
  },
  household: {
    current: ['household', 'current'] as const,
  },
};
