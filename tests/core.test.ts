import test from 'node:test'
import assert from 'node:assert/strict'
import { projectActionLedger, summarizeLedger } from '../src/core.js'

function result(callId: string, isError = false) {
  return {
    message: {
      role: 'user',
      source: { kind: 'tool', callId },
      content: [{ type: 'tool-result', toolCallId: callId, content: [], ...(isError ? { isError: true } : {}) }],
    },
  }
}

test('projects completed lifecycle from DSH-shaped tool events', () => {
  const rows = projectActionLedger([
    { seq: 1, type: 'tool/call', data: { callId: 'c1', name: 'bash', arguments: '{}' } },
    { seq: 2, type: 'tool/result', data: result('c1') },
  ])
  assert.deepEqual(rows[0]?.phases, ['requested', 'completed'])
})

test('pairs DSH approval events by approval id', () => {
  const rows = projectActionLedger([
    { seq: 1, type: 'tool/call', data: { callId: 'c2', name: 'write', arguments: '{}' } },
    { seq: 2, type: 'approval/asked', data: { id: 'a1', toolName: 'write', callId: 'c2' } },
    { seq: 3, type: 'approval/decided', data: { id: 'a1', outcome: 'rejected' } },
  ])
  assert.deepEqual(rows[0]?.phases, ['requested', 'approval-requested', 'denied'])
})

test('maps allowed-once to approved', () => {
  const rows = projectActionLedger([
    { seq: 1, type: 'approval/asked', data: { id: 'a2', toolName: 'write', callId: 'c3' } },
    { seq: 2, type: 'approval/decided', data: { id: 'a2', outcome: 'allowed-once' } },
  ])
  assert.deepEqual(rows[0]?.phases, ['approval-requested', 'approved'])
})

test('maps tool-result isError to failed', () => {
  const rows = projectActionLedger([
    { seq: 1, type: 'tool/call', data: { callId: 'a', name: 'bash', arguments: '{}' } },
    { seq: 2, type: 'tool/result', data: result('a', true) },
  ])
  assert.deepEqual(rows[0]?.phases, ['requested', 'failed'])
})

test('summarizes terminal and pending records', () => {
  const records = projectActionLedger([
    { seq: 1, type: 'tool/call', data: { callId: 'a', name: 'a', arguments: '{}' } },
    { seq: 2, type: 'tool/result', data: result('a') },
    { seq: 3, type: 'tool/call', data: { callId: 'b', name: 'b', arguments: '{}' } },
  ])
  assert.deepEqual(summarizeLedger(records), { total: 2, completed: 1, failed: 0, denied: 0, pending: 1 })
})
