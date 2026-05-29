import React, { useMemo, useState } from 'react';
import { Download, ServerCog, Zap } from 'lucide-react';
import type { DashboardData, QueueData } from './ai-datacentre/types';
import ProofPackPanel from './ProofPackPanel';
import ConstructedScenarioPanel from './ConstructedScenarioPanel';
import { LARGE_LOAD_CONSTRUCTED_SCENARIO } from '../lib/commercialScenarioBundles';
import {
  buildLargeLoadDescriptor,
  buildLargeLoadProofBundle,
  buildLargeLoadReadinessSummary,
  type LargeLoadScenarioInput,
} from '../lib/largeLoadReadinessProofPack';
import {
  downloadTextArtifact,
  renderHtmlProofDocument,
} from '../lib/proofPack';

interface LargeLoadReadinessPanelProps {
  selectedProvince: string;
  queueData: QueueData | null;
  dcData: DashboardData | null;
}

const DEFAULT_INPUT: LargeLoadScenarioInput = {
  ...LARGE_LOAD_CONSTRUCTED_SCENARIO.input,
};

export function LargeLoadReadinessPanel({
  selectedProvince,
  queueData,
  dcData,
}: LargeLoadReadinessPanelProps) {
  const [input, setInput] = useState<LargeLoadScenarioInput>(DEFAULT_INPUT);
  const proofBundle = useMemo(() => buildLargeLoadProofBundle(), []);
  const summary = useMemo(
    () => buildLargeLoadReadinessSummary({ selectedProvince, queueData, dcData, input }),
    [dcData, input, queueData, selectedProvince],
  );

  const proofActions = useMemo(() => {
    const descriptor = buildLargeLoadDescriptor({ input, summary });
    return proofBundle.artifacts.map((artifact) => {
      if (artifact.id === 'large-load-readiness-summary') {
        return {
          ...artifact,
          onDownload: () => downloadTextArtifact(
            artifact,
            renderHtmlProofDocument({ ...descriptor, definition: artifact }),
            'text/html;charset=utf-8;',
          ),
        };
      }

      return {
        ...artifact,
        onDownload: () => downloadTextArtifact(
          artifact,
          [
            '# Large-load backlog checklist',
            '',
            ...summary.backlogChecklist.map((item) => `- ${item}`),
          ].join('\n'),
          'text/markdown;charset=utf-8;',
        ),
      };
    });
  }, [input, proofBundle.artifacts, summary]);

  function loadConstructedScenario() {
    setInput({ ...LARGE_LOAD_CONSTRUCTED_SCENARIO.input });
  }

  return (
    <div className="card p-6 mb-8" data-testid="large-load-readiness-panel">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
            <ServerCog className="w-6 h-6 text-electric" />
            Large-Load Connection Readiness
          </h2>
          <p className="mt-2 text-secondary">
            Alberta-only planning overlay for a single large-load scenario. This is a screening narrative, not an engineering approval.
          </p>
        </div>
        <Zap className="w-5 h-5 text-electric" />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Requested MW">
          <input
            type="number"
            value={input.requestedMw}
            onChange={(event) => setInput((current) => ({ ...current, requestedMw: Number(event.target.value) }))}
            className="w-full rounded-lg border border-[var(--border-medium)] px-3 py-2"
          />
        </Field>
        <Field label="Timeline band">
          <select
            value={input.timelineBand}
            onChange={(event) => setInput((current) => ({ ...current, timelineBand: event.target.value as LargeLoadScenarioInput['timelineBand'] }))}
            className="w-full rounded-lg border border-[var(--border-medium)] px-3 py-2"
          >
            <option value="0-12 months">0-12 months</option>
            <option value="12-24 months">12-24 months</option>
            <option value="24+ months">24+ months</option>
          </select>
        </Field>
        <Field label="On-site generation MW">
          <input
            type="number"
            value={input.onSiteGenerationMw}
            onChange={(event) => setInput((current) => ({ ...current, onSiteGenerationMw: Number(event.target.value) }))}
            className="w-full rounded-lg border border-[var(--border-medium)] px-3 py-2"
          />
        </Field>
        <Field label="BYOP / storage MW">
          <input
            type="number"
            value={input.byopStorageContributionMw}
            onChange={(event) => setInput((current) => ({ ...current, byopStorageContributionMw: Number(event.target.value) }))}
            className="w-full rounded-lg border border-[var(--border-medium)] px-3 py-2"
          />
        </Field>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <MetricCard label="Net grid ask" value={`${summary.netGridAskMw.toFixed(1)} MW`} />
        <MetricCard label="Phase 1 remaining" value={`${summary.phase1RemainingMw.toFixed(1)} MW`} />
        <MetricCard label="Queue to peak" value={`${summary.queueToPeakRatioPct.toFixed(1)}%`} />
        <MetricCard label="Readiness band" value={summary.readinessBand.replace(/_/g, ' ')} />
      </div>

      <div className="mt-6 rounded-xl border border-[var(--border-subtle)] bg-secondary p-4">
        <div className="font-semibold text-primary">Readout</div>
        <p className="mt-2 text-sm text-secondary">{summary.narrative}</p>
        <ul className="mt-3 space-y-2 text-sm text-secondary">
          {summary.backlogChecklist.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </div>

      <div className="mt-6">
        <ConstructedScenarioPanel
          scenario={LARGE_LOAD_CONSTRUCTED_SCENARIO}
          onLoad={loadConstructedScenario}
          testId="large-load-constructed-scenario"
        />
      </div>

      <div className="mt-6">
        <ProofPackPanel
          title={proofBundle.title}
          summary={proofBundle.summary}
          artifacts={proofActions}
        />
      </div>

      <div className="mt-4 flex items-center gap-2 text-sm text-secondary">
        <Download className="w-4 h-4 text-electric" />
        Export the readiness pack only after the current Alberta queue context is loaded and the scenario assumptions are reviewed.
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-medium text-secondary">{label}</div>
      {children}
    </label>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-secondary p-4">
      <div className="text-sm text-secondary">{label}</div>
      <div className="mt-2 text-xl font-bold text-primary">{value}</div>
    </div>
  );
}

export default LargeLoadReadinessPanel;
