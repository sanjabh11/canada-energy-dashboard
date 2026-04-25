from __future__ import annotations

import argparse
from pathlib import Path

if __package__ is None or __package__ == "":
    import sys

    sys.path.append(str(Path(__file__).resolve().parents[2]))

from training.common.dataset_manifest import build_dataset_manifest
from training.common.weight_export import DEFAULT_SEED, PLACEHOLDER_TRAINED_AT, write_json
from training.dispatch_pinn.simulator import (
    SIMULATOR_NAME,
    SIMULATOR_TOPOLOGY,
    SIMULATOR_VERSION,
    build_dispatch_rows,
    write_jsonl,
)


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate pandapower DC-OPF calibrated dispatch scenarios.")
    parser.add_argument("--out", required=True, help="Path to the scenario JSONL output.")
    parser.add_argument("--manifest", required=True, help="Path to the dataset manifest JSON output.")
    parser.add_argument("--count", type=int, default=5000, help="Scenario count to generate.")
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED, help="Deterministic seed. Default: 42.")
    parser.add_argument("--git-commit", default=None, help="Optional git commit sha to record.")
    args = parser.parse_args()

    rows = build_dispatch_rows(args.count, args.seed)
    write_jsonl(Path(args.out), rows)
    write_json(
        Path(args.manifest),
        build_dataset_manifest(
            model_key="dispatch-pinn-v2",
            scenario_count=args.count,
            simulator_name=SIMULATOR_NAME,
            simulator_version=SIMULATOR_VERSION,
            topology=SIMULATOR_TOPOLOGY,
            seed=args.seed,
            prepared_at=PLACEHOLDER_TRAINED_AT,
            source_description="pandapower DC-OPF calibrated dispatch scenarios on IEEE-30",
            sampling_strategy="latin_hypercube",
            git_commit_sha=args.git_commit,
        ),
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
