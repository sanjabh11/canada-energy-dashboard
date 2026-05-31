import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Lock,
  Mail,
  Shield,
  ShieldCheck,
} from 'lucide-react';
import ProofPackPanel from '../ProofPackPanel';
import {
  buildUtilitySecurityControlMatrixCsv,
  buildUtilitySecurityDescriptor,
  buildUtilitySecurityEvidenceIndex,
  buildUtilitySecurityEvidenceMappingCsv,
  buildUtilitySecurityOwnerChecklistMarkdown,
  buildUtilitySecurityPilotAttachmentManifestMarkdown,
  buildUtilitySecurityProofBundle,
  buildUtilitySecurityQuestionnaireTemplateMarkdown,
  UTILITY_SECURITY_CHECKLIST,
  UTILITY_SECURITY_CONTROLS,
} from '../../lib/utilitySecurityProofPack';
import {
  downloadTextArtifact,
  renderHtmlProofDocument,
} from '../../lib/proofPack';

export function UtilitySecurityStatement() {
  const proofBundle = useMemo(() => buildUtilitySecurityProofBundle(), []);
  const proofActions = useMemo(() => {
    const descriptor = buildUtilitySecurityDescriptor();
    return proofBundle.artifacts.map((artifact) => {
      if (artifact.id === 'utility-security-review-pack') {
        return {
          ...artifact,
          onDownload: () => downloadTextArtifact(
            artifact,
            renderHtmlProofDocument({ ...descriptor, definition: artifact }),
            'text/html;charset=utf-8;',
          ),
        };
      }
      if (artifact.id === 'utility-security-control-matrix') {
        return {
          ...artifact,
          onDownload: () => downloadTextArtifact(
            artifact,
            buildUtilitySecurityControlMatrixCsv(),
            'text/csv;charset=utf-8;',
          ),
        };
      }
      if (artifact.id === 'utility-security-checklist') {
        return {
          ...artifact,
          onDownload: () => downloadTextArtifact(
            artifact,
            ['# Utility security review checklist', '', ...UTILITY_SECURITY_CHECKLIST.map((item) => `- ${item}`)].join('\n'),
            'text/markdown;charset=utf-8;',
          ),
        };
      }
      if (artifact.id === 'utility-security-questionnaire-template') {
        return {
          ...artifact,
          onDownload: () => downloadTextArtifact(
            artifact,
            buildUtilitySecurityQuestionnaireTemplateMarkdown(),
            'text/markdown;charset=utf-8;',
          ),
        };
      }
      if (artifact.id === 'utility-security-owner-checklist') {
        return {
          ...artifact,
          onDownload: () => downloadTextArtifact(
            artifact,
            buildUtilitySecurityOwnerChecklistMarkdown(),
            'text/markdown;charset=utf-8;',
          ),
        };
      }
      if (artifact.id === 'utility-security-evidence-mapping') {
        return {
          ...artifact,
          onDownload: () => downloadTextArtifact(
            artifact,
            buildUtilitySecurityEvidenceMappingCsv(),
            'text/csv;charset=utf-8;',
          ),
        };
      }
      if (artifact.id === 'utility-security-pilot-attachment-manifest') {
        return {
          ...artifact,
          onDownload: () => downloadTextArtifact(
            artifact,
            buildUtilitySecurityPilotAttachmentManifestMarkdown(),
            'text/markdown;charset=utf-8;',
          ),
        };
      }
      return {
        ...artifact,
        onDownload: () => downloadTextArtifact(
          artifact,
          JSON.stringify(buildUtilitySecurityEvidenceIndex(), null, 2),
          'application/json;charset=utf-8;',
        ),
      };
    });
  }, [proofBundle.artifacts]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-300">
      <header className="border-b border-slate-700 bg-slate-800 py-4 px-6">
        <div className="mx-auto flex max-w-5xl items-center gap-4">
          <Link
            to="/utility-demand-forecast"
            className="flex items-center gap-2 text-slate-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
            Back
          </Link>
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-cyan-400" />
            <h1 className="text-xl font-bold text-white">Utility Security & Data-Handling Statement</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Structured review surface</div>
              <h2 className="mt-2 text-2xl font-semibold text-white">Security review pack instead of trust-only copy</h2>
              <p className="mt-2 max-w-3xl text-sm text-slate-400">
                This route keeps repo-backed design controls separate from deployed evidence and owner-supplied review items. It does not claim SOC 2, NERC, Green Button Alliance approval, or utility production approval.
              </p>
              <p className="mt-2 max-w-3xl text-xs text-cyan-200">
                Constructed forecast-pilot attachment pack. Use these downloads to answer utility diligence questions without presenting them as certifications or production approvals.
              </p>
            </div>
            <Lock className="h-5 w-5 text-cyan-300" />
          </div>
        </div>

        <div className="mt-6">
          <ProofPackPanel
            title={proofBundle.title}
            summary={proofBundle.summary}
            artifacts={proofActions}
          />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-2xl border border-slate-700 bg-slate-800/60 p-6" data-testid="utility-security-control-matrix">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-cyan-300" />
              <h2 className="text-lg font-semibold text-white">Control matrix</h2>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400">
                    <th className="px-3 py-2 text-left">Control</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Detail</th>
                    <th className="px-3 py-2 text-left">Evidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {UTILITY_SECURITY_CONTROLS.map((control) => (
                    <tr key={control.id}>
                      <td className="px-3 py-3 text-white">{control.control}</td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                          control.status === 'repo_backed_design'
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : control.status === 'deployed_evidence_required'
                              ? 'bg-sky-500/15 text-sky-200'
                              : 'bg-amber-500/15 text-amber-200'
                        }`}>
                          {control.status === 'repo_backed_design'
                            ? 'repo-backed design'
                            : control.status === 'deployed_evidence_required'
                              ? 'deployed evidence required'
                              : 'owner-supplied'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-300">{control.detail}</td>
                      <td className="px-3 py-3 text-slate-500">{control.evidence}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-6">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-cyan-300" />
                <h2 className="text-lg font-semibold text-white">Utility review checklist</h2>
              </div>
              <div className="mt-4 space-y-3">
                {UTILITY_SECURITY_CHECKLIST.map((item) => (
                  <div key={item} className="flex items-start gap-3 text-sm text-slate-300">
                    <ShieldCheck className="mt-0.5 h-4 w-4 text-cyan-300" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-6">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-cyan-300" />
                <h2 className="text-lg font-semibold text-white">Review boundaries and contacts</h2>
              </div>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <p>Use this pack for utility diligence only. Third-party certifications, buyer-specific legal responses, and production credentials remain external approval gates.</p>
                <p>
                  <strong>Security:</strong>{' '}
                  <a href="mailto:security@ceip.energy" className="text-cyan-400 hover:underline">security@ceip.energy</a>
                </p>
                <p>
                  <strong>Privacy:</strong>{' '}
                  <a href="mailto:privacy@ceip.energy" className="text-cyan-400 hover:underline">privacy@ceip.energy</a>
                </p>
                <p>
                  <strong>Legal:</strong>{' '}
                  <a href="mailto:legal@ceip.energy" className="text-cyan-400 hover:underline">legal@ceip.energy</a>
                </p>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-12 flex gap-6 border-t border-slate-800 pt-8">
          <Link to="/privacy" className="text-cyan-400 hover:underline">Privacy Policy</Link>
          <Link to="/terms" className="text-cyan-400 hover:underline">Terms of Service</Link>
          <Link to="/utility-demand-forecast" className="text-cyan-400 hover:underline">Utility Forecasting Lane</Link>
        </div>
      </main>
    </div>
  );
}

export default UtilitySecurityStatement;
