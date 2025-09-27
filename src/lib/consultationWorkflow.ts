/**
 * Consultation Workflow Management System
 *
 * Comprehensive system for managing Indigenous and stakeholder consultation processes
 * with FPIC compliance, consent logging, audit trails, and cultural protocol adherence.
 */

// Core interface definitions
export interface ConsultationWorkflow {
  id: string;
  title: string;
  type: 'environmental_assessment' | 'land_use_planning' | 'natural_resource_development' | 'infrastructure_project' | 'policy_development';
  phase: 'identification' | 'information_dissemination' | 'engagement' | 'negotiation' | 'consent' | 'implementation';
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';

  // Parties involved
  initiatingParty: {
    id: string;
    name: string;
    type: 'government' | 'corporation' | 'organization';
    contactInfo: ContactInfo[];
  };

  stakeholders: Stakeholder[];
  indigenousParties: IndigenousParty[];

  // Timeline and milestones
  createdDate: string;
  targetCompletionDate: string;
  milestones: Milestone[];
  currentMilestone: string;

  // Legal and regulatory requirements
  regulatoryFramework: string[];
  legalRequirements: string[];
  environmentalAssessment: EnvironmentalImpact;
  culturalImpactAssessment?: CulturalImpactAssessment;

  // Communication and documentation
  communications: Communication[];
  documents: Document[];
  meetingRecords: MeetingRecord[];

  // Consent and approvals
  consentStatus: ConsentStatus;
  consensusMechanism: 'unanimous' | 'majority' | 'quasi_unanimous';

  // Risk and issue management
  criticalIssues: CriticalIssue[];
  risks: Risk[];

  // Metadata
  location: Location[];
  affectedTerritories: string[];
  affectedPopulations: number;
  budget?: number;
  responsiblePersonnel: ContactInfo[];
}

export interface Stakeholder {
  id: string;
  name: string;
  organization?: string;
  role: string;
  type: 'individual' | 'community' | 'organization' | 'business' | 'government';
  interest: 'directly_affected' | 'indirectly_affected' | 'general_interest';
  contactInfo: ContactInfo[];
  consultationPreferences: ConsultationPreference;
  engagementLevel: 'high' | 'medium' | 'low';
  consentAuthorty: boolean;
  representativeOf?: {
    group: string;
    members: number;
  };
}

export interface IndigenousParty {
  id: string;
  nation: string;
  bandCouncils: BandCouncil[];
  traditionalTerritories: string[];
  population: number;
  languages: string[];
  contactInfo: ContactInfo[];
  consultationProtocol: ConsultationProtocol;
  fpicRequirements: FPICRequirements;
  treatyRights: string[];
  landClaims: string[];
}

export interface BandCouncil {
  name: string;
  chief: string;
  councilors: Councilor[];
  fpicAuthority: boolean;
  contactInfo: ContactInfo[];
}

export interface Councilor {
  name: string;
  role: string;
  contactInfo: ContactInfo[];
}

export interface ContactInfo {
  type: 'email' | 'phone' | 'address' | 'video_conference' | 'in_person';
  value: string;
  preferred: boolean;
  verifiedDate?: string;
}

export interface ConsultationPreference {
  frequency: 'daily' | 'weekly' | 'monthly' | 'as_needed';
  language: string;
  format: 'in_person' | 'virtual' | 'written' | 'social_media';
  topics: string[];
  locations: string[];
}

export interface ConsultationProtocol {
  duration: number; // expected duration in months
  frequencyOfMeetings: string;
  decisionMakingProcess: string;
  informationRequirements: string[];
  traditionalKnowledgeRequirements: boolean;
  healingCirclesRequired: boolean;
  ceremonyRequirements: string[];
  accommodationRequirements: string[];
  reimbursementRequirements: boolean;
}

export interface FPICRequirements {
  informationStage: boolean;
  consultationStage: boolean;
  participationStage: boolean;
  consentAuthority: string[]; // who has authority to give consent
 BlockingConditions: string[]; // conditions that would prevent consent
  consentMechnism: 'band_council_resolution' | 'community_referendum' | 'elder_council' | 'community_meeting';
  consentDuration: number; // in years
  withdrawalConditions: string[];
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  phase: string;
  order: number;
  requiredTasks: string[];
  completionCriteria: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  actualCompletionDate?: string;
  targetCompletionDate: string;
  assignedTo: string[];
  prerequisites: string[];
  deliverables: string[];
  approvedBy?: string[];
}

export interface EnvironmentalImpact {
  type: 'federal_screening' | 'provincial_assessment' | 'comprehensive_study' | 'federal_assessment';
  assessmentBody: string;
  referenceNumber: string;
  assessmentPhase: string;
  requiredPermissions: string[];
  amendments: Amendment[];
}

export interface Amendment {
  id: string;
  type: string;
  description: string;
  justification: string;
  dateSubmitted: string;
  dateApproved?: string;
  status: 'pending' | 'approved' | 'denied';
}

export interface CulturalImpactAssessment {
  heritageSitesAffected: HeritageSite[];
  traditionalUseAreas: TraditionalUseArea[];
  speciesAtRisk: SpeciesAtRisk[];
  traditionalKnowledgeRequirements: string[];
  mitigationRequirements: MitigationMeasure[];
}

export interface HeritageSite {
  name: string;
  significance: string;
  location: Location;
  stewardship: string[];
  protectionStatus: string;
}

export interface TraditionalUseArea {
  name: string;
  description: string;
  useType: 'hunting' | 'gathering' | 'fishing' | 'camping' | 'ceremony';
  seasonalTiming: string;
  userGroups: string[];
  conflicts: string[];
}

export interface SpeciesAtRisk {
  speciesName: string;
  scientificName: string;
  cosewicStatus: string;
  reasonForConcern: string;
  mitigationMeasures: MitigationMeasure[];
}

export interface MitigationMeasure {
  type: string;
  description: string;
  implementationDate: string;
  monitoringRequirements: string[];
  successCriteria: string[];
  responsibleParty: string;
  cost?: number;
}

export interface Communication {
  id: string;
  type: 'email' | 'meeting' | 'phone_call' | 'video_conference' | 'letter' | 'social_media';
  subject: string;
  content: string;
  sender: string;
  recipients: string[];
  dateSent: string;
  responseRequired: boolean;
  responseDate?: string;
  attachments?: Attachment[];
  followUpActions?: string[];
}

export interface Attachment {
  id: string;
  filename: string;
  fileType: string;
  fileSize: number;
  uploadDate: string;
  uploadedBy: string;
}

export interface MeetingRecord {
  id: string;
  type: 'consultation' | 'information_session' | 'negotiation' | 'decision_making';
  date: string;
  location: Location;
  participants: Participant[];
  agenda: string[];
  notes: string;
  decisions: string[];
  actionItems: ActionItem[];
  consensus: boolean;
  consensusMechanism: string;
}

export interface Participant {
  id: string;
  name: string;
  role: string;
  organization: string;
  attendance: 'present' | 'absent' | 'excused' | 'virtual';
}

export interface ActionItem {
  id: string;
  description: string;
  assignedTo: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  deadline: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  followUpRequired: boolean;
}

export interface ConsentStatus {
  overallConsent: 'none' | 'partial' | 'canadian_consent' | 'full_consent';
  partyConsents: PartyConsent[];
  consentDate?: string;
  consentConditions: string[];
  consentDuration: number;
  consentWithdrawalRights: string;
  reviewIntervals: number[]; // in years
  monitoringRequirements: string[];
}

export interface PartyConsent {
  partyId: string;
  partyName: string;
  partyContactInfo?: ContactInfo;
  consentGiven: boolean;
  consentDate?: string;
  consentAuthorization: string;
  consentAbstentions: string;
  consentConditions: string[];
  consentSignature?: DigitalSignature;
  revocationRights: string;
}

export interface DigitalSignature {
  id: string;
  signerName: string;
  signerRole: string;
  signatureMethod: 'digital' | 'electronic' | 'wet_signature';
  signatureDate: string;
  signatureTimestamp: string;
  signatureCertificate?: string;
  verificationMethod: 'certificate_based' | 'biometric' | 'hash_based' | 'timestamp';
  signatureValue: string;
  integrityHash: string;
}

export interface CriticalIssue {
  id: string;
  title: string;
  description: string;
  category: 'environmental' | 'cultural' | 'social' | 'economic' | 'legal';
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  status: 'open' | 'resolved' | 'deferred';
  reportedDate: string;
  reportedBy: string;
  assignedTo: string[];
  resolution?: string;
  resolutionDate?: string;
  resolutionBy?: string;
  impact: string;
  riskMitigationActions: string[];
}

export interface Risk {
  id: string;
  title: string;
  description: string;
  category: 'schedule_delay' | 'budget_overrun' | 'consent_revocation' | 'environmental_damage' | 'cultural_harm' | 'legal_challenge';
  probability: 'low' | 'medium' | 'high' | 'critical';
  impact: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'mitigated' | 'realized' | 'closed';
  mitigationStrategy: string;
  mitigationActions: MitigationAction[];
  monitoringRequirements: string[];
  triggerConditions: string[];
  contingencyPlans: string[];
}

export interface MitigationAction {
  id: string;
  description: string;
  assignedTo: string;
  deadline: string;
  status: 'pending' | 'in_progress' | 'completed';
  completionDate?: string;
  effectivenessRating?: 'effective' | 'partially_effective' | 'ineffective';
}

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
  municipality: string;
  province: string;
  country: string;
  description?: string;
}

export interface Document {
  id: string;
  title: string;
  type: 'consultation_materials' | 'background_documents' | 'compliance_documents' | 'contracts' | 'reports' | 'correspondence';
  version: string;
  versionHistory: DocumentVersion[];
  classification: 'public' | 'sensitive' | 'confidential' | 'restricted';
  filePath: string;
  fileSize: number;
  uploadDate: string;
  uploadedBy: string;
  lastModified: string;
  accessPermissions: AccessPermission[];
  translationRequired?: string[];
  expiryDate?: string;
}

export interface DocumentVersion {
  version: string;
  changeDescription: string;
  changedBy: string;
  changeDate: string;
  fileSize: number;
  fileHash: string;
}

export interface AccessPermission {
  userType: 'all_users' | 'authenticated_users' | 'stakeholder_group' | 'indigenous_party' | 'project_team';
  userId?: string;
  groupId?: string;
  permission: 'read' | 'write' | 'admin';
  grantedDate: string;
  grantedBy: string;
  expiryDate?: string;
}

// Workflow Management Service
type WorkflowEventPayload = {
  type: string;
  data: unknown;
};

type WorkflowEventListener = (event: WorkflowEventPayload) => void;

export class ConsultationWorkflowService {
  private static instance: ConsultationWorkflowService;
  private workflows: Map<string, ConsultationWorkflow> = new Map();
  private listeners: Map<string, WorkflowEventListener[]> = new Map();

  private constructor() {
    // Initialize with sample data for development
    this.initializeSampleData();
  }

  public static getInstance(): ConsultationWorkflowService {
    if (!ConsultationWorkflowService.instance) {
      ConsultationWorkflowService.instance = new ConsultationWorkflowService();
    }
    return ConsultationWorkflowService.instance;
  }

  /**
   * Create a new consultation workflow
   */
  createWorkflow(workflow: Omit<ConsultationWorkflow, 'id'>): ConsultationWorkflow {
    const newWorkflow: ConsultationWorkflow = {
      ...workflow,
      id: `consultation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    this.workflows.set(newWorkflow.id, newWorkflow);
    this.notifyListeners('workflow_created', newWorkflow);
    return newWorkflow;
  }

  /**
   * Update an existing consultation workflow
   */
  updateWorkflow(id: string, updates: Partial<ConsultationWorkflow>): ConsultationWorkflow {
    const workflow = this.workflows.get(id);
    if (!workflow) {
      throw new Error(`Consultation workflow ${id} not found`);
    }

    const updatedWorkflow = { ...workflow, ...updates };
    this.workflows.set(id, updatedWorkflow);

    this.createAuditEntry(updatedWorkflow.id, 'workflow_updated', updates, 'system');
    this.notifyListeners('workflow_updated', updatedWorkflow);

    return updatedWorkflow;
  }

  /**
   * Get workflow by ID
   */
  getWorkflow(id: string): ConsultationWorkflow | undefined {
    return this.workflows.get(id);
  }

  /**
   * Get all workflows with optional filtering
   */
  getWorkflows(filters?: {
    status?: string[];
    type?: string[];
    phase?: string[];
    priority?: string[];
  }): ConsultationWorkflow[] {
    let workflows = Array.from(this.workflows.values());

    if (filters) {
      Object.entries(filters).forEach(([filterKey, filterValues]) => {
        if (filterValues.length > 0) {
          workflows = workflows.filter(workflow =>
            filterValues.includes((workflow as any)[filterKey])
          );
        }
      });
    }

    return workflows;
  }

  /**
   * Move workflow to next milestone
   */
  advanceMilestone(workflowId: string, userId?: string): Milestone[] {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Consultation workflow ${workflowId} not found`);
    }

    const currentMilestoneIndex = workflow.milestones.findIndex(m => m.id === workflow.currentMilestone);
    if (currentMilestoneIndex === -1) {
      throw new Error('Current milestone not found');
    }

    const currentMilestone = workflow.milestones[currentMilestoneIndex];

    // Mark current milestone as completed
    currentMilestone.status = 'completed';
    currentMilestone.actualCompletionDate = new Date().toISOString();

    // Find next milestone
    if (currentMilestoneIndex < workflow.milestones.length - 1) {
      const nextMilestone = workflow.milestones[currentMilestoneIndex + 1];
      nextMilestone.status = 'in_progress';
      workflow.currentMilestone = nextMilestone.id;

      // Check if prerequisites are met
      if (!this.checkPrerequisites(nextMilestone, workflow)) {
        throw new Error('Prerequisites not met for next milestone');
      }
    }

    this.createAuditEntry(workflowId, 'milestone_completed',
      { milestoneId: currentMilestone.id, nextMilestoneId: workflow.currentMilestone },
      userId || 'system'
    );

    this.notifyListeners('milestone_advanced', workflow);
    return workflow.milestones;
  }

  /**
   * Record consent from a party
   */
  recordConsent(workflowId: string, partyConsent: PartyConsent, userId?: string): ConsentStatus {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Consultation workflow ${workflowId} not found`);
    }

    // Add or update party consent
    const existingPartyIndex = workflow.consentStatus.partyConsents.findIndex(
      pc => pc.partyId === partyConsent.partyId
    );

    if (existingPartyIndex >= 0) {
      workflow.consentStatus.partyConsents[existingPartyIndex] = partyConsent;
    } else {
      workflow.consentStatus.partyConsents.push(partyConsent);
    }

    // Update overall consent status
    workflow.consentStatus = this.calculateConsentStatus(workflow.consentStatus.partyConsents,
                                                         workflow.consensusMechanism);

    // Check if full consent is achieved
    if (partyConsent.consentGiven && this.isFullConsentAchieved(workflow)) {
      workflow.consentStatus.consentDate = new Date().toISOString();
      workflow.phase = 'implementation';
      workflow.status = 'completed';
    }

    this.createAuditEntry(workflowId, 'consent_recorded', partyConsent, userId || 'system');
    this.notifyListeners('consent_updated', workflow);

    return workflow.consentStatus;
  }

  /**
   * Add a communication to the workflow
   */
  addCommunication(workflowId: string, communication: Omit<Communication, 'id' | 'dateSent'>): Communication {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Consultation workflow ${workflowId} not found`);
    }

    const newCommunication: Communication = {
      ...communication,
      id: `comm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      dateSent: new Date().toISOString()
    };

    workflow.communications.push(newCommunication);

    // Create follow-up actions if required
    if (newCommunication.followUpActions) {
      newCommunication.followUpActions.forEach(action => {
        const followUpMilestone: Milestone = {
          id: `followup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: `Follow-up: ${action}`,
          description: action,
          phase: workflow.phase,
          order: workflow.milestones.length + 1,
          requiredTasks: [action],
          completionCriteria: ['Action completed'],
          status: 'pending',
          targetCompletionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week
          assignedTo: [communication.sender],
          prerequisites: [],
          deliverables: []
        };
        workflow.milestones.push(followUpMilestone);
      });
    }

    this.createAuditEntry(workflowId, 'communication_added', newCommunication, 'system');
    this.notifyListeners('communication_added', workflow);

    return newCommunication;
  }

  /**
   * Add a meeting record to the workflow
   */
  addMeetingRecord(workflowId: string, meetingRecord: Omit<MeetingRecord, 'id'>): MeetingRecord {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Consultation workflow ${workflowId} not found`);
    }

    const newMeeting: MeetingRecord = {
      ...meetingRecord,
      id: `meeting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    workflow.meetingRecords.push(newMeeting);

    this.createAuditEntry(workflowId, 'meeting_added', newMeeting, 'system');
    this.notifyListeners('meeting_recorded', workflow);

    return newMeeting;
  }

  /**
   * Calculate overall consent status based on party consents
   */
  private calculateConsentStatus(partyConsents: PartyConsent[],
                                 consensusMechanism: string): ConsentStatus {
    const totalParties = partyConsents.length;
    const consentingParties = partyConsents.filter(pc => pc.consentGiven).length;

    let overallConsent: ConsentStatus['overallConsent'] = 'none';

    switch (consensusMechanism) {
      case 'unanimous':
        overallConsent = consentingParties === totalParties ? 'full_consent' :
                         consentingParties > 0 ? 'partial' : 'none';
        break;
      case 'majority':
        overallConsent = consentingParties > totalParties / 2 ? 'canadian_consent' :
                         consentingParties > 0 ? 'partial' : 'none';
        break;
      case 'quasi_unanimous':
        overallConsent = consentingParties >= totalParties * 0.8 ? 'full_consent' :
                         consentingParties > totalParties / 2 ? 'canadian_consent' :
                         consentingParties > 0 ? 'partial' : 'none';
        break;
    }

    return {
      overallConsent,
      partyConsents,
      // ... other consent status fields (would be calculated from individual party consents)
    } as ConsentStatus;
  }

  /**
   * Check if prerequisites are met for a milestone
   */
  private checkPrerequisites(milestone: Milestone, workflow: ConsultationWorkflow): boolean {
    return milestone.prerequisites.every(prereqId => {
      const prereqMilestone = workflow.milestones.find(m => m.id === prereqId);
      return prereqMilestone?.status === 'completed';
    });
  }

  /**
   * Check if full consent is achieved
   */
  private isFullConsentAchieved(workflow: ConsultationWorkflow): boolean {
    return workflow.consentStatus.overallConsent === 'full_consent';
  }

  /**
   * Create audit entry for workflow changes
   */
  private createAuditEntry(workflowId: string, action: string, details: any, userId: string): void {
    console.log(`Audit[${workflowId}]: ${action} by ${userId}`, details);
    // In production, this would write to an audit log database
  }

  /**
   * Subscribe to workflow events
   */
  onWorkflowEvent(workflowId: string, callback: WorkflowEventListener): () => void {
    const existing = this.listeners.get(workflowId) ?? [];
    this.listeners.set(workflowId, [...existing, callback]);

    return () => {
      const listeners = this.listeners.get(workflowId) || [];
      const next = listeners.filter(listener => listener !== callback);
      if (next.length > 0) {
        this.listeners.set(workflowId, next);
      } else {
        this.listeners.delete(workflowId);
      }
    };
  }

  /**
   * Notify listeners of workflow events
   */
  private notifyListeners(eventType: string, data: unknown): void {
    this.listeners.forEach((listenerList) => {
      listenerList.forEach(listener => {
        try {
          listener({ type: eventType, data });
        } catch (error) {
          console.error('Error in workflow listener callback:', error);
        }
      });
    });
  }

  /**
   * Initialize sample data for development
   */
  private initializeSampleData(): void {
    // Sample data would be added here for development and testing
    // This is omitted for brevity but would include realistic consultation workflow examples
  }

  /**
   * Get workflow progress metrics
   */
  getWorkflowMetrics(workflowId: string): {
    progressPercent: number;
    milestonesCompleted: number;
    totalMilestones: number;
    consentsGiven: number;
    totalParties: number;
    risksActive: number;
    daysToDeadline: number;
  } {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Consultation workflow ${workflowId} not found`);
    }

    const milestonesCompleted = workflow.milestones.filter(m => m.status === 'completed').length;
    const totalMilestones = workflow.milestones.length;
    const progressPercent = totalMilestones > 0 ? (milestonesCompleted / totalMilestones) * 100 : 0;

    const consentsGiven = workflow.consentStatus.partyConsents.filter(pc => pc.consentGiven).length;
    const totalParties = workflow.indigenousParties.length + workflow.stakeholders.length;

    const risksActive = workflow.risks.filter(r => r.status === 'active').length;

    const deadline = new Date(workflow.targetCompletionDate).getTime();
    const now = Date.now();
    const daysToDeadline = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

    return {
      progressPercent,
      milestonesCompleted,
      totalMilestones,
      consentsGiven,
      totalParties,
      risksActive,
      daysToDeadline
    };
  }

  /**
   * Generate progress report
   */
  generateProgressReport(workflowId: string): string {
    const workflow = this.workflows.get(workflowId);
    const metrics = this.getWorkflowMetrics(workflowId);

    if (!workflow) {
      throw new Error(`Consultation workflow ${workflowId} not found`);
    }

    return `
CONSULTATION PROGRESS REPORT
============================

Project: ${workflow.title}
Type: ${workflow.type}
Phase: ${workflow.phase}
Status: ${workflow.status}
Priority: ${workflow.priority}

PROGRESS OVERVIEW
-----------------
Progress: ${metrics.progressPercent.toFixed(1)}%
Milestones: ${metrics.milestonesCompleted}/${metrics.totalMilestones} completed
Consents: ${metrics.consentsGiven}/${metrics.totalParties} obtained
Time Remaining: ${metrics.daysToDeadline} days

CURRENT PHASE: ${workflow.phase.toUpperCase()}
Current Milestone: ${workflow.milestones.find(m => m.id === workflow.currentMilestone)?.title || 'None'}

NEXT MILESTONES
---------------
${workflow.milestones
  .filter(m => m.status !== 'completed')
  .slice(0, 3)
  .map(m => `- ${m.title} (Due: ${new Date(m.targetCompletionDate).toLocaleDateString()})`)
  .join('\n')}

RISK STATUS
-----------
Active Risks: ${metrics.risksActive}
${workflow.risks.filter(r => r.status === 'active').map(r => `- ${r.title} (${r.category})`).join('\n')}

CONSENT STATUS
--------------
Overall Status: ${workflow.consentStatus.overallConsent.toUpperCase()}
Consent Date: ${workflow.consentStatus.consentDate || 'Pending'}

Pending Consents:
${workflow.consentStatus.partyConsents
  .filter(pc => !pc.consentGiven)
  .map(pc => `- ${pc.partyName}`)
  .join('\n')}

REPORT GENERATED: ${new Date().toLocaleString()}
    `.trim();
  }
}

// Export singleton instance
export const consultationWorkflowService = ConsultationWorkflowService.getInstance();