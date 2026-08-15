import test from 'node:test'
import assert from 'node:assert/strict'
import { projectActionLedger, summarizeLedger } from '../src/core.js'

test('projects completed lifecycle', () => {
  const rows = projectActionLedger([
    { seq: 1, type: 'tool/call', data: { callId: 'c1', name: 'bash' } },
    { seq: 2, type: 'tool/result', data: { callId: 'c1', isError: false } },
  ])
  assert.deepEqual(rows[0]?.phases, ['requested', 'completed'])
})

test('projects approval and denial', () => {
  const rows = projectActionLedger([
    { seq: 1, type: 'tool/call', data: { callId: 'c2', name: 'write' } },
    { seq: 2, type: 'approval/asked', data: { callId: 'c2' } },
    { seq: 3, type: 'approval/decided', data: { callId: 'c2', decision: 'deny' } },
  ])
  assert.deepEqual(rows[0]?.phases, ['requested', 'approval-requested', 'denied'])
})

test('does not duplicate adjacent phases', () => {
  const rows = projectActionLedger([
    { seq: 1, type: 'tool/call', data: { callId: 'x', name: 'read' } },
    { seq: 2, type: 'tool/call', data: { callId: 'x', name: 'read' } },
  ])
  assert.deepEqual(rows[0]?.phases, ['requested'])
})

test('sorts by durable sequence', () => {
  const rows = projectActionLedger([
    { seq: 4, type: 'tool/result', data: { callId: 'a', isError: true } },
    { seq: 2, type: 'tool/call', data: { callId: 'a', name: 'bash' } },
  ])
  assert.deepEqual(rows[0]?.phases, ['requested', 'failed'])
})

test('summarizes terminal and pending records', () => {
  const records = projectActionLedger([
    { seq: 1, type: 'tool/call', data: { callId: 'a', name: 'a' } },
    { seq: 2, type: 'tool/result', data: { callId: 'a', isError: false } },
    { seq: 3, type: 'tool/call', data: { callId: 'b', name: 'b' } },
  ])
  assert.deepEqual(summarizeLedger(records), { total: 2, completed: 1, failed: 0, denied: 0, pending: 1 })
})
