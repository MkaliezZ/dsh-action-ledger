import type { Context } from '@deepseek-ai/cordis'
import { projectActionLedger, summarizeLedger, type LedgerFact } from './core.js'

export const name = 'action-ledger'
export const inject = ['commands']

export interface Config { maxRows?: number }

export function apply(ctx: Context, config: Config = {}): void {
  const maxRows = Math.max(1, Math.min(200, config.maxRows ?? 40))
  ctx.commands.register({
    name: 'action-ledger',
    description: 'Show a bounded projection of this DSH session action lifecycle.',
    recordInput: false,
    async handler(invocation) {
      const facts = invocation.agent.session.entries() as LedgerFact[]
      const records = projectActionLedger(facts)
      const summary = summarizeLedger(records)
      const rows = records.slice(-maxRows).map((r) => `${r.callId}  ${r.toolName}  ${r.phases.join(' -> ')}`)
      return { kind: 'success', text: [`Action Ledger`, `total=${summary.total} completed=${summary.completed} failed=${summary.failed} denied=${summary.denied} pending=${summary.pending}`, ...rows].join('\n') }
    },
  })
}

export * from './core.js'
