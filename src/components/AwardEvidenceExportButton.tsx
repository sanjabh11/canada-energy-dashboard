/**
 * Award Evidence Export Button
 * 
 * Validates dashboard KPIs against export data and downloads CSV
 * Blocks export if mismatches exceed 1% tolerance
 */

import React, { useState } from 'react';
import { Download, CheckCircle, AlertTriangle, Loader } from 'lucide-react';
import { exportAwardEvidence, downloadAwardEvidence, type DashboardKPIs, type AwardExportJSON } from '../lib/awardEvidenceExport';

interface AwardEvidenceExportButtonProps {
  dashboardKPIs: DashboardKPIs;
  onFetchExportData: () => Promise<AwardExportJSON>;
  className?: string;
}

export const AwardEvidenceExportButton: React.FC<AwardEvidenceExportButtonProps> = ({
  dashboardKPIs,
  onFetchExportData,
  className = ''
}) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  const handleExport = async () => {
    setLoading(true);
    setStatus('idle');
    setMessage('');

    try {
      // Fetch export data from API
      const exportData = await onFetchExportData();

      // Validate and export
      const result = await exportAwardEvidence(dashboardKPIs, exportData);

      if (result.success && result.data) {
        // Download the CSV
        const timestamp = new Date().toISOString().slice(0, 10);
        downloadAwardEvidence(result.data, `award-evidence-${timestamp}.csv`);
        
        setStatus('success');
        setMessage('✅ Award evidence exported successfully! Validation passed.');
      } else {
        setStatus('error');
        setMessage(result.error || 'Export failed');
      }
    } catch (error: any) {
      setStatus('error');
      setMessage(`Export failed: ${error.message || String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <button
        onClick={handleExport}
        disabled={loading}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
          ${loading 
            ? 'bg-gray-300 text-gray-600 cursor-not-allowed' 
            : 'bg-blue-600 text-white hover:bg-blue-700'
          }
        `}
      >
        {loading ? (
          <>
            <Loader className="animate-spin" size={18} />
            <span>Validating & Exporting...</span>
          </>
        ) : (
          <>
            <Download size={18} />
            <span>Export Award Evidence</span>
          </>
        )}
      </button>

      {status === 'success' && (
        <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={18} />
          <div className="text-sm text-green-800">{message}</div>
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
          <div className="text-sm text-red-800">{message}</div>
        </div>
      )}

      <div className="text-xs text-gray-600 space-y-1">
        <div>✓ Validates dashboard KPIs match export data (1% tolerance)</div>
        <div>✓ Includes provenance, sample counts, and calibration status</div>
        <div>✓ CSV format ready for award submission</div>
      </div>
    </div>
  );
};

export default AwardEvidenceExportButton;
