// Interface per IMPLEMENTATION_PLAN.md §37 — every "talk to a department"
// call in the app goes through this, never a direct fetch to a government
// endpoint from a service.
export interface GovernmentIntegrationAdapter {
  submitApplication(applicationId: string): Promise<{ referenceId: string; status: string }>;
  getApplicationStatus(applicationId: string): Promise<{ status: string }>;
  uploadDocument(applicationId: string, documentId: string): Promise<{ accepted: boolean }>;
  getQueries(applicationId: string): Promise<Array<Record<string, unknown>>>;
  submitResponse(queryId: string, responseText: string): Promise<{ accepted: boolean }>;
  getInspectionSchedule(applicationId: string): Promise<Array<Record<string, unknown>>>;
}
