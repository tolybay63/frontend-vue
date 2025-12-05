export const nsiDashboardQueryKeys = {
  coverage: ['nsi-dashboard', 'coverage'] as const,
  diagnostics: ['nsi-dashboard', 'diagnostics'] as const,
  activity: (limit: number) => ['nsi-dashboard', 'activity', limit] as const,
  relations: ['nsi-dashboard', 'relations'] as const,
}
