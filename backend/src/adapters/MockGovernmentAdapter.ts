import { GovernmentIntegrationAdapter } from './GovernmentIntegrationAdapter';

/**
 * Everything this adapter returns MUST be labeled "Simulated integration"
 * wherever it reaches the UI (plan §37, DEVELOPER_GUIDE §6) — never imply a
 * live government connection. Swap for a real adapter behind the same
 * interface once a department API exists.
 */
export class MockGovernmentAdapter implements GovernmentIntegrationAdapter {
  async submitApplication(applicationId: string) {
    return {
      referenceId: `SIM-${applicationId.slice(0, 8).toUpperCase()}`,
      status: 'submitted',
      integration_type: 'Simulated integration' as const,
      is_simulated: true,
      timestamp: new Date().toISOString(),
    };
  }

  async getApplicationStatus(_applicationId: string) {
    return {
      status: 'under_review',
      integration_type: 'Simulated integration' as const,
      is_simulated: true,
      checked_at: new Date().toISOString(),
    };
  }

  async uploadDocument(_applicationId: string, _documentId: string) {
    return {
      accepted: true,
      integration_type: 'Simulated integration' as const,
      is_simulated: true,
    };
  }

  async getQueries(_applicationId: string) {
    return [];
  }

  async submitResponse(_queryId: string, _responseText: string) {
    return {
      accepted: true,
      integration_type: 'Simulated integration' as const,
      is_simulated: true,
    };
  }

  async getInspectionSchedule(_applicationId: string) {
    return [];
  }
}

export const mockGovernmentAdapter = new MockGovernmentAdapter();

