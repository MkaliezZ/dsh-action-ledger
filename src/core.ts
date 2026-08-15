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

function recordFor(map: Map<string, ActionRecord>, callId: string, toolName = 'unknown', seq = 0): ActionRecord {
  const existing = map.get(callId)
  if (existing) return existing
  const created: ActionRecord = { callId, toolName, phases: [], requestedSeq: seq }
  map.set(callId, created)
  return created
}

function pushUnique(record: ActionRecord, phase: ActionPhase): void {
  if (record.phases.at(-1) !== phase) record.phases.push(phase)
}

export function projectActionLedger(facts: readonly LedgerFact[]): ActionRecord[] {
  const records = new Map<string, ActionRecord>()
  for (const fact of [...facts].sort((a, b) => a.seq - b.seq)) {
    const data = (fact.data ?? {}) as Record<string, unknown>
    const callId = String(data.callId ?? data.toolCallId ?? '')
    if (!callId) continue
    const toolName = String(data.name ?? data.toolName ?? 'unknown')
    if (fact.type === 'tool/call') {
      const record = recordFor(records, callId, toolName, fact.seq)
      pushUnique(record, 'requested')
      continue
    }
    const record = recordFor(records, callId, toolName, fact.seq)
    if (fact.type === 'approval/asked') pushUnique(record, 'approval-requested')
    else if (fact.type === 'approval/decided') {
      const decision = String(data.decision ?? data.action ?? data.outcome ?? '').toLowerCase()
      pushUnique(record, decision === 'allow' || decision === 'approved' || decision === 'approve' ? 'approved' : 'denied')
    } else if (fact.type === 'tool/result') {
      const isError = Boolean(data.isError)
      record.resultIsError = isError
      record.terminalSeq = fact.seq
      pushUnique(record, isError ? 'failed' : 'completed')
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
