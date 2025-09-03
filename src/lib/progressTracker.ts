/**
 * Automated Consultation Progress Tracking System
 *
 * Provides real-time progress tracking, milestone reporting, and automated notifications
 * for Indigenous and stakeholder consultation processes.
 */

// Import required types from consultation workflow system
import { consultationWorkflowService } from './consultationWorkflow';
import type {
  ConsultationWorkflow,
  Milestone,
  Risk,
  Communication
} from './consultationWorkflow';

export interface ProgressSnapshot {
  timestamp: string;
  workflowId: string;
  progressPercent: number;
  milestonesCompleted: number;
  totalMilestones: number;
  consentsGiven: number;
  totalParties: number;
  daysToDeadline: number;
  status: 'on_track' | 'delayed' | 'critical';
  nextCriticalMilestone?: Milestone;
  overdueMilestones: Milestone[];
  recentActivity: Activity[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface Activity {
  id: string;
  type: 'milestone_completed' | 'consent_given' | 'communication_sent' | 'meeting_held' | 'risk_identified' | 'issue_resolved';
  description: string;
  timestamp: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface ProgressAlert {
  id: string;
  workflowId: string;
  level: 'info' | 'warning' | 'critical';
  category: 'deadline' | 'milestone' | 'consent' | 'risk' | 'communication';
  title: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedDate?: string;
}

export interface ProgressReport {
  id: string;
  workflowId: string;
  reportType: 'daily' | 'weekly' | 'monthly' | 'milestone' | 'final';
  period: {
    startDate: string;
    endDate: string;
  };
  summary: {
    progressPercent: number;
    changeFromPrevious: number;
    milestonesCompleted: number;
    milestonesAdded: number;
    consentsGiven: number;
    communicationsSent: number;
    meetingsHeld: number;
  };
  highlight: Activity[];
  risks: Risk[];
  recommendations: string[];
  nextSteps: string[];
  generatedBy: string;
  generatedAt: string;
}

export class ProgressTrackerService {
  private static instance: ProgressTrackerService;
  private progressSnapshots = new Map<string, ProgressSnapshot[]>();
  private alerts = new Map<string, ProgressAlert[]>();
  private activityLog = new Map<string, Activity[]>();
  private scheduledReports = new Map<string, ProgressReport[]>();
  private monitoringIntervals = new Map<string, NodeJS.Timeout>();

  private constructor() {
    // Initialize cleanup routine
    this.setupCleanupRoutine();
  }

  public static getInstance(): ProgressTrackerService {
    if (!ProgressTrackerService.instance) {
      ProgressTrackerService.instance = new ProgressTrackerService();
    }
    return ProgressTrackerService.instance;
  }

  /**
   * Start monitoring a consultation workflow
   */
  startTracking(workflowId: string, config?: {
    snapshotInterval?: number; // minutes
    alertThresholds?: {
      deadlineWarningDays: number;
      progressionWarningPercent: number;
      riskAlertLevel: 'medium' | 'high' | 'critical';
    };
  }): void {
    const workflow = consultationWorkflowService.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error(`Consultation workflow ${workflowId} not found`);
    }

    // Default configuration
    const defaultConfig = {
      snapshotInterval: 30, // 30 minutes
      alertThresholds: {
        deadlineWarningDays: 30,
        progressionWarningPercent: 10,
        riskAlertLevel: 'high' as const
      },
      ...config
    };

    // Start monitoring interval
    const interval = setInterval(() => {
      this.createProgressSnapshot(workflowId);
      this.checkAlerts(workflowId, defaultConfig.alertThresholds);
    }, defaultConfig.snapshotInterval * 60 * 1000);

    this.monitoringIntervals.set(workflowId, interval);

    // Initial snapshot and alert check
    this.createProgressSnapshot(workflowId);
    this.checkAlerts(workflowId, defaultConfig.alertThresholds);

    console.log(`Started progress tracking for workflow ${workflowId}`);
  }

  /**
   * Stop monitoring a consultation workflow
   */
  stopTracking(workflowId: string): void {
    const interval = this.monitoringIntervals.get(workflowId);
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(workflowId);
    }
    console.log(`Stopped progress tracking for workflow ${workflowId}`);
  }

  /**
   * Create a progress snapshot for a workflow
   */
  createProgressSnapshot(workflowId: string): ProgressSnapshot | null {
    try {
      const metrics = consultationWorkflowService.getWorkflowMetrics(workflowId);
      const workflow = consultationWorkflowService.getWorkflow(workflowId);

      if (!workflow) return null;

      const snapshot: ProgressSnapshot = {
        timestamp: new Date().toISOString(),
        workflowId,
        progressPercent: metrics.progressPercent,
        milestonesCompleted: metrics.milestonesCompleted,
        totalMilestones: metrics.totalMilestones,
        consentsGiven: metrics.consentsGiven,
        totalParties: metrics.totalParties,
        daysToDeadline: metrics.daysToDeadline,
        status: this.calculateStatus(metrics, workflow),
        nextCriticalMilestone: this.getNextCriticalMilestone(workflow),
        overdueMilestones: this.getOverdueMilestones(workflow),
        recentActivity: this.getRecentActivity(workflowId),
        riskLevel: this.calculateRiskLevel(workflow.risks)
      };

      // Store snapshot
      if (!this.progressSnapshots.has(workflowId)) {
        this.progressSnapshots.set(workflowId, []);
      }
      this.progressSnapshots.get(workflowId)!.push(snapshot);

      // Keep only last 100 snapshots
      const snapshots = this.progressSnapshots.get(workflowId)!;
      if (snapshots.length > 100) {
        snapshots.shift();
      }

      return snapshot;
    } catch (error) {
      console.error('Error creating progress snapshot:', error);
      return null;
    }
  }

  /**
   * Get current progress snapshot
   */
  getCurrentProgress(workflowId: string): ProgressSnapshot | null {
    const snapshots = this.progressSnapshots.get(workflowId);
    return snapshots && snapshots.length > 0
      ? snapshots[snapshots.length - 1]
      : null;
  }

  /**
   * Get progress history for a workflow
   */
  getProgressHistory(workflowId: string, days: number = 7): ProgressSnapshot[] {
    const snapshots = this.progressSnapshots.get(workflowId) || [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return snapshots.filter(s => new Date(s.timestamp) >= cutoff);
  }

  /**
   * Generate a progress report
   */
  generateProgressReport(workflowId: string, reportType: ProgressReport['reportType']): ProgressReport {
    const currentProgress = this.getCurrentProgress(workflowId);
    const historySnapshots = this.getProgressHistory(workflowId, 30);
    const workflow = consultationWorkflowService.getWorkflow(workflowId);

    if (!currentProgress || !workflow) {
      throw new Error('No progress data available');
    }

    // Calculate period
    const startDate = reportType === 'daily' ? new Date()
      : reportType === 'weekly' ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      : reportType === 'monthly' ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      : (historySnapshots[0]?.timestamp || currentProgress.timestamp);

    const endDate = currentProgress.timestamp;

    // Calculate summary metrics
    const oldProgress = historySnapshots.length > 1 ? historySnapshots[0] : currentProgress;
    const progressChange = currentProgress.progressPercent - oldProgress.progressPercent;

    const report: ProgressReport = {
      id: `report_${workflowId}_${Date.now()}`,
      workflowId,
      reportType,
      period: {
          startDate: typeof startDate === 'string' ? startDate : startDate.toISOString(),
          endDate
        },
      summary: {
        progressPercent: currentProgress.progressPercent,
        changeFromPrevious: progressChange,
        milestonesCompleted: this.countMilestonesInPeriod(workflow, startDate, endDate),
        milestonesAdded: this.countMilestonesAddedInPeriod(workflow, startDate, endDate),
        consentsGiven: this.countConsentsInPeriod(workflow, startDate, endDate),
        communicationsSent: this.countCommunicationsInPeriod(workflow, startDate, endDate),
        meetingsHeld: this.countMeetingsInPeriod(workflow, startDate, endDate)
      },
      highlight: this.getHighlights(workflowId, startDate, endDate),
      risks: workflow.risks.filter(r => r.status === 'active'),
      recommendations: this.generateRecommendations(currentProgress),
      nextSteps: this.generateNextSteps(workflow),
      generatedBy: 'system', // In production, would be actual user
      generatedAt: new Date().toISOString()
    };

    // Store report
    if (!this.scheduledReports.has(workflowId)) {
      this.scheduledReports.set(workflowId, []);
    }
    this.scheduledReports.get(workflowId)!.push(report);

    return report;
  }

  /**
   * Get active alerts for a workflow
   */
  getAlerts(workflowId: string, includeAcknowledged: boolean = false): ProgressAlert[] {
    const workflowAlerts = this.alerts.get(workflowId) || [];
    return workflowAlerts.filter(alert =>
      includeAcknowledged || !alert.acknowledged
    );
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(workflowId: string, alertId: string, userId: string): void {
    const workflowAlerts = this.alerts.get(workflowId);
    if (workflowAlerts) {
      const alert = workflowAlerts.find(a => a.id === alertId);
      if (alert) {
        alert.acknowledged = true;
        alert.acknowledgedBy = userId;
        alert.acknowledgedDate = new Date().toISOString();
      }
    }
  }

  /**
   * Log an activity for a workflow
   */
  logActivity(workflowId: string, activity: Omit<Activity, 'id' | 'timestamp'>): void {
    const fullActivity: Activity = {
      ...activity,
      id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    };

    if (!this.activityLog.has(workflowId)) {
      this.activityLog.set(workflowId, []);
    }

    this.activityLog.get(workflowId)!.push(fullActivity);

    // Keep only last 1000 activities per workflow
    const activities = this.activityLog.get(workflowId)!;
    if (activities.length > 1000) {
      activities.shift();
    }
  }

  /**
   * Get recent activities
   */
  getRecentActivity(workflowId: string, limit: number = 20): Activity[] {
    const activities = this.activityLog.get(workflowId) || [];
    return activities.slice(-limit);
  }

  // Private helper methods

  private calculateStatus(metrics: any, workflow: ConsultationWorkflow): ProgressSnapshot['status'] {
    if (metrics.daysToDeadline < 0) {
      return 'critical';
    } else if (metrics.daysToDeadline < 7 ||
               workflow.milestones.some(m => m.status === 'in_progress' && new Date(m.targetCompletionDate) < new Date())) {
      return 'delayed';
    } else {
      return 'on_track';
    }
  }

  private getNextCriticalMilestone(workflow: ConsultationWorkflow): Milestone | undefined {
    const pendingMilestones = workflow.milestones
      .filter(m => m.status === 'pending')
      .sort((a, b) => new Date(a.targetCompletionDate).getTime() - new Date(b.targetCompletionDate).getTime());

    return pendingMilestones[0];
  }

  private getOverdueMilestones(workflow: ConsultationWorkflow): Milestone[] {
    return workflow.milestones.filter(m => {
      const targetDate = new Date(m.targetCompletionDate);
      return m.status === 'in_progress' && targetDate < new Date();
    });
  }

  private getRecentActivityInternal(workflowId: string): Activity[] {
    return this.getRecentActivity(workflowId, 10);
  }

  private calculateRiskLevel(risks: Risk[]): ProgressSnapshot['riskLevel'] {
    if (risks.some(r => r.status === 'realized' && r.impact === 'critical')) {
      return 'critical';
    } else if (risks.some(r => r.status === 'realized' && r.impact === 'high')) {
      return 'high';
    } else if (risks.some(r => r.status === 'active' && r.probability === 'high')) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  private countMilestonesInPeriod(workflow: ConsultationWorkflow, start: Date | string, end: Date | string): number {
    const startDate = new Date(start);
    const endDate = new Date(end);

    return workflow.milestones.filter(m => {
      if (m.actualCompletionDate) {
        const completionDate = new Date(m.actualCompletionDate);
        return completionDate >= startDate && completionDate <= endDate;
      }
      return false;
    }).length;
  }

  private countMilestonesAddedInPeriod(workflow: ConsultationWorkflow, start: Date | string, end: Date | string): number {
    // In a real implementation, this would track when milestones were added
    return 0; // Placeholder
  }

  private countConsentsInPeriod(workflow: ConsultationWorkflow, start: Date | string, end: Date | string): number {
    const startDate = new Date(start);
    const endDate = new Date(end);

    return workflow.consentStatus.partyConsents.filter(party => {
      if (party.consentDate) {
        const consentDate = new Date(party.consentDate);
        return consentDate >= startDate && consentDate <= endDate;
      }
      return false;
    }).length;
  }

  private countCommunicationsInPeriod(workflow: ConsultationWorkflow, start: Date | string, end: Date | string): number {
    const startDate = new Date(start);
    const endDate = new Date(end);

    return workflow.communications.filter(comm => {
      const commDate = new Date(comm.dateSent);
      return commDate >= startDate && commDate <= endDate;
    }).length;
  }

  private countMeetingsInPeriod(workflow: ConsultationWorkflow, start: Date | string, end: Date | string): number {
    const startDate = new Date(start);
    const endDate = new Date(end);

    return workflow.meetingRecords.filter(meeting => {
      const meetingDate = new Date(meeting.date);
      return meetingDate >= startDate && meetingDate <= endDate;
    }).length;
  }

  private getHighlights(workflowId: string, start: Date | string, end: Date | string): Activity[] {
    const activities = this.getRecentActivity(workflowId, 50);

    // Filter by date range and highlight significant activities
    const startDate = new Date(start);
    const endDate = new Date(end);

    return activities.filter(activity => {
      const activityDate = new Date(activity.timestamp);
      const significantTypes = ['milestone_completed', 'consent_given', 'meeting_held'];
      return activityDate >= startDate && activityDate <= endDate &&
             significantTypes.includes(activity.type);
    }).slice(0, 5);
  }

  private generateRecommendations(progress: ProgressSnapshot): string[] {
    const recommendations: string[] = [];

    if (progress.status === 'delayed') {
      recommendations.push('Increase resource allocation to address project delay');
    }

    if (progress.daysToDeadline < 30) {
      recommendations.push('Consider requesting deadline extension if necessary');
    }

    if (progress.milestonesCompleted !== 0 && progress.totalMilestones !== 0 &&
        (progress.milestonesCompleted / progress.totalMilestones) < 0.5) {
      recommendations.push('Schedule stakeholder meeting to address outstanding milestones');
    }

    if (progress.riskLevel === 'high' || progress.riskLevel === 'critical') {
      recommendations.push('Review and address identified risks immediately');
    }

    if (progress.consentsGiven < progress.totalParties / 2) {
      recommendations.push('Accelerate consultations to obtain more consents');
    }

    return recommendations.length > 0 ? recommendations : ['Project is progressing well, continue current course'];
  }

  /**
   * Get recent activity for a workflow (public method)
   */
  private getRecentActivityForWorkflow(workflowId: string): Activity[] {
    return this.getRecentActivity(workflowId, 10);
  }

  private generateNextSteps(workflow: ConsultationWorkflow): string[] {
    const nextSteps: string[] = [];
    const nextMilestone = workflow.milestones.find(m => m.status === 'pending');

    if (nextMilestone) {
      nextSteps.push(`Complete ${nextMilestone.title}`);
      nextMilestone.requiredTasks.forEach(task =>
        nextSteps.push(`• ${task}`)
      );
    }

    if (workflow.consentStatus.partyConsents.some(p => !p.consentGiven)) {
      nextSteps.push('Obtain consents from remaining stakeholders');
    }

    if (workflow.meetingRecords.length === 0 ||
        new Date(workflow.meetingRecords[workflow.meetingRecords.length - 1].date) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) {
      nextSteps.push('Schedule next stakeholder consultation meeting');
    }

    return nextSteps.length > 0 ? nextSteps : ['No immediate next steps identified'];
  }

  private checkAlerts(workflowId: string, thresholds: any): void {
    const currentProgress = this.getCurrentProgress(workflowId);
    if (!currentProgress) return;

    const alerts: ProgressAlert[] = [];

    // Deadline alert
    if (currentProgress.daysToDeadline <= thresholds.deadlineWarningDays) {
      alerts.push({
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        workflowId,
        level: currentProgress.daysToDeadline < 7 ? 'critical' : 'warning',
        category: 'deadline',
        title: 'Deadline Approaching',
        message: `Project deadline is in ${currentProgress.daysToDeadline} days. Consider acceleration planning.`,
        timestamp: new Date().toISOString(),
        acknowledged: false
      });
    }

    // Overdue milestone alert
    if (currentProgress.overdueMilestones.length > 0) {
      alerts.push({
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        workflowId,
        level: 'critical',
        category: 'milestone',
        title: 'Overdue Milestones',
        message: `${currentProgress.overdueMilestones.length} milestones are overdue and require immediate attention.`,
        timestamp: new Date().toISOString(),
        acknowledged: false
      });
    }

    // Risk alert
    if (currentProgress.riskLevel === thresholds.riskAlertLevel ||
        currentProgress.riskLevel === 'critical') {
      alerts.push({
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        workflowId,
        level: currentProgress.riskLevel === 'critical' ? 'critical' : 'warning',
        category: 'risk',
        title: 'Risk Level Alert',
        message: `Project risk level is ${currentProgress.riskLevel}. Review risk mitigation strategy.`,
        timestamp: new Date().toISOString(),
        acknowledged: false
      });
    }

    // Store alerts
    alerts.forEach(alert => {
      if (!this.alerts.has(workflowId)) {
        this.alerts.set(workflowId, []);
      }
      this.alerts.get(workflowId)!.push(alert);
    });

    // Keep only last 50 alerts per workflow
    const workflowAlerts = this.alerts.get(workflowId)!;
    if (workflowAlerts.length > 50) {
      workflowAlerts.splice(0, workflowAlerts.length - 50);
    }
  }

  private setupCleanupRoutine(): void {
    // Clean up old data every hour
    setInterval(() => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90); // Keep 90 days

      // Clean up old snapshots
      this.progressSnapshots.forEach((snapshots, workflowId) => {
        const filtered = snapshots.filter(s => new Date(s.timestamp) > cutoffDate);
        this.progressSnapshots.set(workflowId, filtered);
      });

      // Clean up old activities (keep 30 days)
      const activityCutoff = new Date();
      activityCutoff.setDate(activityCutoff.getDate() - 30);

      this.activityLog.forEach((activities, workflowId) => {
        const filtered = activities.filter(a => new Date(a.timestamp) > activityCutoff);
        this.activityLog.set(workflowId, filtered);
      });

    }, 60 * 60 * 1000); // Run every hour
  }

  /**
   * Get all tracked workflows
   */
  getTrackedWorkflows(): string[] {
    return Array.from(this.monitoringIntervals.keys());
  }

  /**
   * Clear all data for a workflow (for cleanup)
   */
  clearWorkflowData(workflowId: string): void {
    this.progressSnapshots.delete(workflowId);
    this.alerts.delete(workflowId);
    this.activityLog.delete(workflowId);
    this.scheduledReports.delete(workflowId);
    this.stopTracking(workflowId);
  }
}

// Export singleton instance
export const progressTrackerService = ProgressTrackerService.getInstance();