export const sourceQueryKeys = {
  all: ['sources'] as const,
  departments: ['source', 'departments'] as const,
  details: (id: number | string | null) => ['source', 'details', id] as const,
}
