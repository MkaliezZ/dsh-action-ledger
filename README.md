# dsh-action-ledger

A bounded action-lifecycle projection for DeepSeek Harness (DSH).

`/action-ledger` reconstructs a human-readable ledger from DSH's existing durable session facts such as `tool/call`, approval lifecycle facts, and `tool/result`. v0.1 intentionally does **not** invent a custom standalone session-event type, so it does not require patching DSH's generated event catalog.

## Why

AgentFuse answers **whether a tool call may proceed**. Action Ledger answers **what lifecycle DSH durably recorded around the call**.

## v0.1

- projects `requested -> approval-requested -> approved|denied -> completed|failed` when the corresponding native DSH facts exist;
- deterministic sequence ordering;
- bounded `/action-ledger` output;
- no raw tool arguments copied into the ledger;
- read-only projection: no tool dispatch and no source mutation.

## Non-claims

- not a replacement for DSH session persistence;
- not an authorization system;
- does not fabricate missing lifecycle facts;
- does not prove a physical side effect happened beyond the facts DSH recorded;
- compatibility must be re-proven against pinned DSH revisions while DSH remains Developer Preview.

## Development

```bash
npm test
```

## License

MIT
