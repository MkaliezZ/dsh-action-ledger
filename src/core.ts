export type ActionPhase = 'requested' | 'approval-requested' | 'approved' | 'denied' | 'completed' | 'failed'

export interface LedgerFact {
  seq: number
  type: string
  time?: number
  data?: unknown
}

export interface ActionRecord {
  callId: string
  toolName: string
  phases: ActionPhase[]
  requestedSeq: number
  terminalSeq?: number
  resultIsError?: boolean
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined
}

function recordFor(map: Map<string, ActionRecord>, callId: string, toolName = 'unknown', seq = 0): ActionRecord {
  const existing = map.get(callId)
  if (existing) {
    if (existing.toolName === 'unknown' && toolName !== 'unknown') existing.toolName = toolName
    return existing
  }
  const created: ActionRecord = { callId, toolName, phases: [], requestedSeq: seq }
  map.set(callId, created)
  return created
}

function pushUnique(record: ActionRecord, phase: ActionPhase): void {
  if (record.phases.at(-1) !== phase) record.phases.push(phase)
}

function toolResultIdentity(data: Record<string, unknown>): { callId: string; isError: boolean } | undefined {
  const message = asRecord(data.message)
  const source = asRecord(message?.source)
  const callId = typeof source?.callId === 'string' ? source.callId : ''
  const content = Array.isArray(message?.content) ? message.content : []
  const block = asRecord(content[0])
  if (!callId || block?.type !== 'tool-result') return undefined
  return { callId, isError: block.isError === true || data.error !== undefined }
}

export function projectActionLedger(facts: readonly LedgerFact[]): ActionRecord[] {
  const records = new Map<string, ActionRecord>()
  const approvalToCall = new Map<string, string>()

  for (const fact of [...facts].sort((a, b) => a.seq - b.seq)) {
    const data = asRecord(fact.data) ?? {}

    if (fact.type === 'tool/call') {
      const callId = typeof data.callId === 'string' ? data.callId : ''
      const toolName = typeof data.name === 'string' ? data.name : 'unknown'
      if (!callId) continue
      const record = recordFor(records, callId, toolName, fact.seq)
      pushUnique(record, 'requested')
      continue
    }

    if (fact.type === 'approval/asked') {
      const callId = typeof data.callId === 'string' ? data.callId : ''
      const approvalId = typeof data.id === 'string' ? data.id : ''
      if (!callId) continue
      if (approvalId) approvalToCall.set(approvalId, callId)
      const toolName = typeof data.toolName === 'string' ? data.toolName : 'unknown'
      const record = recordFor(records, callId, toolName, fact.seq)
      pushUnique(record, 'approval-requested')
      continue
    }

    if (fact.type === 'approval/decided') {
      const approvalId = typeof data.id === 'string' ? data.id : ''
      const callId = approvalId ? approvalToCall.get(approvalId) ?? '' : ''
      if (!callId) continue
      const outcome = typeof data.outcome === 'string' ? data.outcome : ''
      const record = recordFor(records, callId)
      pushUnique(record, outcome === 'allowed-once' ? 'approved' : 'denied')
      continue
    }

    if (fact.type === 'tool/result') {
      const identity = toolResultIdentity(data)
      if (!identity) continue
      const record = recordFor(records, identity.callId, 'unknown', fact.seq)
      record.resultIsError = identity.isError
      record.terminalSeq = fact.seq
      pushUnique(record, identity.isError ? 'failed' : 'completed')
    }
  }

  return [...records.values()].sort((a, b) => a.requestedSeq - b.requestedSeq || a.callId.localeCompare(b.callId))
}

export function summarizeLedger(records: readonly ActionRecord[]): { total: number; completed: number; failed: number; denied: number; pending: number } {
  let completed = 0, failed = 0, denied = 0, pending = 0
  for (const record of records) {
    const last = record.phases.at(-1)
    if (last === 'completed') completed++
    else if (last === 'failed') failed++
    else if (last === 'denied') denied++
    else pending++
  }
  return { total: records.length, completed, failed, denied, pending }
}
