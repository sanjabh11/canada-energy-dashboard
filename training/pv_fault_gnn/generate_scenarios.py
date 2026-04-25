from __future__ import annotations

import argparse
from pathlib import Path

if __package__ is None or __package__ == "":
    import sys

    sys.path.append(str(Path(__file__).resolve().parents[2]))

from training.common.weight_export import DEFAULT_SEED
from training.pv_fault_gnn.simulator import build_dataset_rows, write_jsonl


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate pvlib + pandapower PV fault scenarios.")
    parser.add_argument("--out", required=True, help="Path to the scenario JSONL output.")
    parser.add_argument("--manifest", required=True, help="Path to the dataset manifest JSON output.")
    parser.add_argument("--count", type=int, default=20000, help="Scenario count to generate.")
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED, help="Deterministic seed. Default: 42.")
    parser.add_argument("--topology", default="mv_oberrhein", help="Topology label to record in the manifest.")
    args = parser.parse_args()

    rows, manifest = build_dataset_rows(count=args.count, seed=args.seed, topology=args.topology)
    write_jsonl(Path(args.out), rows)
    from training.common.weight_export import write_json  # local import keeps startup cost low

    write_json(Path(args.manifest), manifest)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
