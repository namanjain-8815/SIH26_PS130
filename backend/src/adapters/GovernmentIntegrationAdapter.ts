// Interface per IMPLEMENTATION_PLAN.md §37 — every "talk to a department"
// call in the app goes through this, never a direct fetch to a government
// endpoint from a service.
export interface GovernmentIntegrationAdapter {
  submitApplication(applicationId: string): Promise<{
    referenceId: string;
    status: string;
    integration_type: 'Simulated integration';
    is_simulated: boolean;
    timestamp: string;
  }>;
  getApplicationStatus(applicationId: string): Promise<{
    status: string;
    integration_type: 'Simulated integration';
    is_simulated: boolean;
    checked_at: string;
  }>;
  uploadDocument(applicationId: string, documentId: string): Promise<{
    accepted: boolean;
    integration_type: 'Simulated integration';
    is_simulated: boolean;
  }>;
  getQueries(applicationId: string): Promise<Array<Record<string, unknown>>>;
  submitResponse(queryId: string, responseText: string): Promise<{
    accepted: boolean;
    integration_type: 'Simulated integration';
    is_simulated: boolean;
  }>;
  getInspectionSchedule(applicationId: string): Promise<Array<Record<string, unknown>>>;
}

