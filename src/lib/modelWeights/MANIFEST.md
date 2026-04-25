# Simulator-Calibrated Weights

`dispatch-pinn-v2.json` is the committed simulator-calibrated dispatch export
trained on 5,000 pandapower DC-OPF Latin-hypercube scenarios on IEEE-30 with
7 input features:

- `load_mw`
- `temperature_c`
- `wind_generation_mw`
- `solar_generation_mw`
- `reserve_margin_percent`
- `ramp_limit_mw_per_hour`
- `previous_dispatch_mw`

Byte-identical rebuilds use seed `42`, and the Python↔TS conformance fixture
lives at `tests/fixtures/dispatch-pinn-conformance.json`.
`pv-gnn-v2.json` is the committed simulator-calibrated PV artifact trained on
20,000 `pvlib` + `pandapower` synthetic faults over the `mv_oberrhein`
topology.

- The dispatch artifact is a real runtime candidate.
- The PV artifact is now a real runtime candidate behind the trained-artifact gate.
- Runtime code may inspect these files behind the production artifact gate.

TODO(2026-06-30): fine-tune `pv-gnn-v2.json` with partner feeder data when it
becomes available; until then, keep the simulator-calibrated qualifier visible
in the UI and metadata.
