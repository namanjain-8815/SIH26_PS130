import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('SLA Timeline & Status Engine (Unit Tests)', () => {
  function computeSLAStatus(params: {
    startDate: Date;
    durationDays: number;
    now: Date;
    isCompleted?: boolean;
    completedDate?: Date;
  }): {
    dueDate: Date;
    status: 'ON_TRACK' | 'AT_RISK' | 'BREACHED' | 'COMPLETED';
    breachDurationDays: number;
  } {
    const { startDate, durationDays, now, isCompleted, completedDate } = params;
    const dueDate = new Date(startDate.getTime() + durationDays * 86_400_000);

    if (isCompleted) {
      return { dueDate, status: 'COMPLETED', breachDurationDays: 0 };
    }

    if (now.getTime() > dueDate.getTime()) {
      const breachDays = Math.ceil((now.getTime() - dueDate.getTime()) / 86_400_000);
      return { dueDate, status: 'BREACHED', breachDurationDays: breachDays };
    }

    const totalMs = dueDate.getTime() - startDate.getTime();
    const remainingMs = dueDate.getTime() - now.getTime();
    const ratio = remainingMs / totalMs;

    // Warning / At Risk threshold: under 25% remaining time
    if (ratio < 0.25) {
      return { dueDate, status: 'AT_RISK', breachDurationDays: 0 };
    }

    return { dueDate, status: 'ON_TRACK', breachDurationDays: 0 };
  }

  it('identifies an SLA as ON_TRACK when ample time remains', () => {
    const startDate = new Date('2025-01-01T00:00:00.000Z');
    const now = new Date('2025-01-05T00:00:00.000Z');
    const durationDays = 30; // Due Jan 31

    const result = computeSLAStatus({ startDate, durationDays, now });
    assert.strictEqual(result.status, 'ON_TRACK');
    assert.strictEqual(result.breachDurationDays, 0);
  });

  it('marks an SLA as AT_RISK when remaining time drops below 25%', () => {
    const startDate = new Date('2025-01-01T00:00:00.000Z');
    const now = new Date('2025-01-26T00:00:00.000Z'); // 5 days left out of 30 (< 25%)
    const durationDays = 30;

    const result = computeSLAStatus({ startDate, durationDays, now });
    assert.strictEqual(result.status, 'AT_RISK');
  });

  it('detects a BREACHED SLA and computes days past due', () => {
    const startDate = new Date('2025-01-01T00:00:00.000Z');
    const now = new Date('2025-02-05T00:00:00.000Z'); // 5 days past Jan 31 due date
    const durationDays = 30;

    const result = computeSLAStatus({ startDate, durationDays, now });
    assert.strictEqual(result.status, 'BREACHED');
    assert.strictEqual(result.breachDurationDays, 5);
  });

  it('marks completed applications as COMPLETED regardless of timeline', () => {
    const startDate = new Date('2025-01-01T00:00:00.000Z');
    const now = new Date('2025-02-05T00:00:00.000Z');
    const durationDays = 30;

    const result = computeSLAStatus({ startDate, durationDays, now, isCompleted: true });
    assert.strictEqual(result.status, 'COMPLETED');
    assert.strictEqual(result.breachDurationDays, 0);
  });
});
