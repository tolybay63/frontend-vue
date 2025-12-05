export interface NsiCoverage {
  sources: { total: number; withIssuerDateExec: number }
  types: { total: number; withShape: number; withComponents: number }
  components: { total: number; withParams: number; withDefects: number }
  params: { total: number; withUnitsAndBounds: number }
  defects: { total: number; withCategoryAndComponent: number }
  works: { total: number; withTypePeriodSource: number }
}

export interface WithPartialFlag {
  partial?: boolean
}

export type DiagnosticSeverity = 'info' | 'warning' | 'critical'

export interface DiagnosticItem {
  code: string
  title: string
  count: number
  severity: DiagnosticSeverity
  linkQuery: Record<string, string>
  target: 'sources' | 'types' | 'components' | 'params' | 'defects' | 'works'
}

export interface ActivityItem {
  id: string
  title: string
  actor: string
  ts: string
  target: 'sources' | 'types' | 'components' | 'params' | 'defects' | 'works'
  targetId: string
}

export interface RelationsCounts {
  sources: number
  types: number
  components: number
  params: number
  defects: number
  works: number
}

export type NsiCoverageResponse = NsiCoverage & WithPartialFlag

export interface DiagnosticsResponse extends WithPartialFlag {
  items: DiagnosticItem[]
}

export interface ActivityResponse extends WithPartialFlag {
  items: ActivityItem[]
}

export type RelationsCountsResponse = RelationsCounts & WithPartialFlag

export type NsiSearchResultType = DiagnosticItem['target']

export interface NsiSearchResult {
  id: string
  title: string
  extra?: string | null
  type: NsiSearchResultType
}
