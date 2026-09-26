import { GovernmentIntegrationAdapter } from './GovernmentIntegrationAdapter';

/**
 * Everything this adapter returns MUST be labeled "Simulated integration"
 * wherever it reaches the UI (plan §37, DEVELOPER_GUIDE §6) — never imply a
 * live government connection. Swap for a real adapter behind the same
 * interface once a department API exists.
 */
export class MockGovernmentAdapter implements GovernmentIntegrationAdapter {
  async submitApplication(applicationId: string) {
    return { referenceId: `SIM-${applicationId.slice(0, 8).toUpperCase()}`, status: 'submitted' };
  }

  async getApplicationStatus() {
    return { status: 'under_review' };
  }

  async uploadDocument() {
    return { accepted: true };
  }

  async getQueries() {
    return [];
  }

  async submitResponse() {
    return { accepted: true };
  }

  async getInspectionSchedule() {
    return [];
  }
}
