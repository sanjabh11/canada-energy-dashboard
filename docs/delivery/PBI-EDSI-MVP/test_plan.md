# Test Plan: PBI-EDSI-MVP

Scenarios:
- Streaming ON (valid env): all datasets stream; UI shows Source: Stream; statuses connected.
- Streaming OFF: datasets load fallback JSON; UI shows Source: Fallback.
- Streaming failure: dashed vs nested endpoints tried; on failure, fallback loads; status fallback with error.
- Persistent cache: after successful load, disable network; both stream and fallback fail → cached data hydrates; status fallback.
- Abort handling: rapid refresh triggers do not overlap; no console errors; last invocation wins.
- Abort propagation: when a load is aborted mid-stream, ensure `AbortError` surfaces, fallback is NOT invoked, and no cache writes occur from the aborted run.
- Edge helper immediate abort: abort an in-flight edge request and verify the helper throws `AbortError` immediately without trying alternate endpoint candidates.

Evidence Collection:
- Record timestamps, console logs, and brief notes in test_evidence.md.
- Include any screenshots if helpful.
