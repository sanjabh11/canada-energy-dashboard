import React, { useState, useEffect, useCallback } from 'react';
import { ConsultationWorkflow, Milestone, ConsentStatus } from '../lib/consultationWorkflow';
import { BarChart, PieChart, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Bar, Pie } from 'recharts';

interface ConsultationTrackerProps {
  workflowId?: string;
  compact?: boolean;
  onMilestoneClick?: (milestone: Milestone) => void;
  onWorkflowSelect?: (workflow: ConsultationWorkflow) => void;
}

export const ConsultationTracker: React.FC<ConsultationTrackerProps> = ({
  workflowId,
  compact = false,
  onMilestoneClick,
  onWorkflowSelect
}) => {
  const [selectedWorkflow, setSelectedWorkflow] = useState<ConsultationWorkflow | null>(null);
  const [workflows, setWorkflows] = useState<ConsultationWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<any>(null);

  const loadMetrics = useCallback(async (id: string) => {
    try {
      const { consultationWorkflowService } = await import('../lib/consultationWorkflow');
      const workflowMetrics = consultationWorkflowService.getWorkflowMetrics(id);
      setMetrics(workflowMetrics);
    } catch (error) {
      console.error('Error loading workflow metrics:', error);
    }
  }, []);

  const loadWorkflows = useCallback(async () => {
    try {
      setLoading(true);
      const { consultationWorkflowService } = await import('../lib/consultationWorkflow');
      const allWorkflows = consultationWorkflowService.getWorkflows();
      setWorkflows(allWorkflows);

      if (!workflowId && allWorkflows.length > 0) {
        setSelectedWorkflow(allWorkflows[0]);
        loadMetrics(allWorkflows[0].id);
      }
    } catch (error) {
      console.error('Failed to load workflows:', error);
    } finally {
      setLoading(false);
    }
  }, [loadMetrics, workflowId]);

  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  useEffect(() => {
    if (workflowId) {
      const workflow = workflows.find(w => w.id === workflowId);
      if (workflow) {
        setSelectedWorkflow(workflow);
        loadMetrics(workflow.id);
      }
    }
  }, [workflowId, workflows, loadMetrics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Consultation Progress</h3>
          {selectedWorkflow && (
            <span className={`px-2 py-1 text-xs rounded-full ${
              selectedWorkflow.status === 'completed' ? 'bg-green-100 text-green-800' :
              selectedWorkflow.status === 'active' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {selectedWorkflow.status}
            </span>
          )}
        </div>

        {selectedWorkflow && metrics && (
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Overall Progress</span>
                <span>{metrics.progressPercent.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${metrics.progressPercent}%` }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-600">Milestones</div>
                <div className="font-semibold">
                  {metrics.milestonesCompleted}/{metrics.totalMilestones}
                </div>
              </div>
              <div>
                <div className="text-gray-600">Consents</div>
                <div className="font-semibold">
                  {metrics.consentsGiven}/{metrics.totalParties}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Consultation Tracker</h2>
          <div className="flex space-x-2">
            <select
              value={selectedWorkflow?.id || ''}
              onChange={(e) => {
                const workflow = workflows.find(w => w.id === e.target.value);
                if (workflow) {
                  setSelectedWorkflow(workflow);
                  loadMetrics(workflow.id);
                  onWorkflowSelect?.(workflow);
                }
              }}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              {workflows.map(workflow => (
                <option key={workflow.id} value={workflow.id}>
                  {workflow.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {selectedWorkflow && metrics ? (
        <div className="p-6 space-y-6">
          {/* Project Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Overall Progress</h3>
              <div className="text-2xl font-bold text-blue-600">
                {metrics.progressPercent.toFixed(0)}%
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${metrics.progressPercent}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-2">Milestones Completed</h3>
              <div className="text-2xl font-bold text-green-600">
                {metrics.milestonesCompleted}/{metrics.totalMilestones}
              </div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-semibold text-purple-900 mb-2">Consents Obtained</h3>
              <div className="text-2xl font-bold text-purple-600">
                {metrics.consentsGiven}/{metrics.totalParties}
              </div>
            </div>
          </div>

          {/* Current Phase & Milestone */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-3">Current Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-600">Current Phase:</span>
                <div className="font-medium">
                  {selectedWorkflow.phase.replace('_', ' ').toUpperCase()}
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-600">Time Remaining:</span>
                <div className="font-medium">
                  {metrics.daysToDeadline > 0 ? `${metrics.daysToDeadline} days` : 'Overdue'}
                </div>
              </div>
            </div>
          </div>

          {/* Milestones List */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Milestones</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {selectedWorkflow.milestones.map((milestone) => (
                <div
                  key={milestone.id}
                  className={`p-4 rounded-lg border cursor-pointer hover:shadow-md transition-all ${
                    milestone.status === 'completed'
                      ? 'border-green-200 bg-green-50'
                      : milestone.status === 'in_progress'
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-gray-200 bg-white'
                  }`}
                  onClick={() => onMilestoneClick?.(milestone)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{milestone.title}</h4>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      milestone.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : milestone.status === 'in_progress'
                        ? 'bg-blue-100 text-blue-800'
                        : milestone.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {milestone.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>Target: {new Date(milestone.targetCompletionDate).toLocaleDateString()}</span>
                    <span>Order: {milestone.order}</span>
                  </div>

                  {milestone.actualCompletionDate && milestone.status === 'completed' && (
                    <div className="text-sm text-green-600 mt-1">
                      ✓ Completed: {new Date(milestone.actualCompletionDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Consent Status Overview */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Consent Status</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Overall Consent */}
              <div className="bg-white p-4 border border-gray-200 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Overall Status</h4>
                <div className="text-2xl font-bold mb-2">
                  <span className={`px-3 py-1 text-sm rounded-full ${
                    selectedWorkflow.consentStatus.overallConsent === 'full_consent'
                      ? 'bg-green-100 text-green-800'
                      : selectedWorkflow.consentStatus.overallConsent === 'partial'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedWorkflow.consentStatus.overallConsent.replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                {selectedWorkflow.consentStatus.consentDate && (
                  <div className="text-sm text-gray-600">
                    Consented: {new Date(selectedWorkflow.consentStatus.consentDate).toLocaleDateString()}
                  </div>
                )}
              </div>

              {/* Party Consents */}
              <div className="bg-white p-4 border border-gray-200 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Party Consents</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedWorkflow.consentStatus.partyConsents.map((party_Consent) => (
                    <div key={party_Consent.partyId} className="flex items-center justify-between">
                      <span className="text-sm">{party_Consent.partyName}</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        party_Consent.consentGiven
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {party_Consent.consentGiven ? '✓ Given' : '✗ Pending'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Progress Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Milestone Progress */}
            <div className="bg-white p-4 border border-gray-200 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-4">Milestone Progress</h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={[
                  { name: 'Completed', value: metrics.milestonesCompleted, fill: '#10b981' },
                  { name: 'Remaining', value: metrics.totalMilestones - metrics.milestonesCompleted, fill: '#e5e7eb' }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Consent Progress */}
            <div className="bg-white p-4 border border-gray-200 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-4">Consent Progress</h4>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Consented', value: metrics.consentsGiven, fill: '#10b981' },
                      { name: 'Pending', value: metrics.totalParties - metrics.consentsGiven, fill: '#f59e0b' }
                    ]}
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#f59e0b" />
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Action Items */}
          {selectedWorkflow.milestones.some(m => m.status === 'in_progress') && (
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <h3 className="font-semibold text-yellow-900 mb-2">⚡ Next Actions Required</h3>
              <div className="space-y-1">
                {selectedWorkflow.milestones
                  .filter(m => m.status === 'in_progress')
                  .flatMap(m => m.requiredTasks)
                  .slice(0, 3)
                  .map((task, index) => (
                    <div key={index} className="text-sm text-yellow-800">
                      • {task}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Generate Report Button */}
          <div className="flex justify-end">
            <button
              onClick={async () => {
                try {
                  const { consultationWorkflowService } = await import('../lib/consultationWorkflow');
                  const report = consultationWorkflowService.generateProgressReport(selectedWorkflow.id);
                  console.log('Progress Report:', report);
                  alert(report); // In production, this would open a modal or generate a PDF
                } catch (error) {
                  console.error('Error generating report:', error);
                  alert('Failed to generate report');
                }
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Generate Progress Report
            </button>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Consultation Selected</h3>
          <p className="text-gray-600">Select a consultation workflow to view progress tracking.</p>
        </div>
      )}
    </div>
  );
};