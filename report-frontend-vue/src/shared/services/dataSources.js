import { createRemoteDataSourceClient } from '@company/report-data-source'
import { sendDataSourceRequest } from '@/shared/api/dataSource'
import { loadReportSources } from '@/shared/api/report'
import { fetchJoinPayload } from '@/shared/lib/sourceJoins.js'

const client = createRemoteDataSourceClient({
  requestData: sendDataSourceRequest,
  loadSources: loadReportSources,
  fetchJoinPayload,
})

export const fetchRemoteRecords = (source, options) =>
  client.fetchRemoteRecords(source, options)
export const clearRemoteRecordCache = () => client.clearCache()
export const preloadRemoteSources = () => client.preloadRemoteSources()
