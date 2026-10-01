import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Database Adapter Matcher & Date Parsing (Unit Tests)', () => {
  function matchesCondition(val: any, cond: any): boolean {
    if (cond === undefined) return true;
    if (cond === null) return val === null;

    if (typeof cond === 'object' && !(cond instanceof Date)) {
      if ('in' in cond && Array.isArray(cond.in)) {
        return cond.in.includes(val);
      }
      if ('not' in cond) {
        if (cond.not === null) return val !== null;
        return val !== cond.not;
      }
      if ('gte' in cond) {
        const c = cond.gte instanceof Date ? cond.gte.getTime() : cond.gte;
        const v =
          val instanceof Date
            ? val.getTime()
            : typeof val === 'string' && !isNaN(Date.parse(val))
            ? new Date(val).getTime()
            : val;
        return v >= c;
      }
      if ('lte' in cond) {
        const c = cond.lte instanceof Date ? cond.lte.getTime() : cond.lte;
        const v =
          val instanceof Date
            ? val.getTime()
            : typeof val === 'string' && !isNaN(Date.parse(val))
            ? new Date(val).getTime()
            : val;
        return v <= c;
      }
      if (!val || typeof val !== 'object') return false;
      for (const [k, v] of Object.entries(cond)) {
        if (!matchesCondition(val[k], v)) return false;
      }
      return true;
    }

    if (cond instanceof Date) {
      const vTime =
        val instanceof Date
          ? val.getTime()
          : typeof val === 'string'
          ? new Date(val).getTime()
          : val;
      return vTime === cond.getTime();
    }

    return val === cond;
  }

  function parseDates(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return obj;
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        obj[i] = parseDates(obj[i]);
      }
      return obj;
    }
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === 'string') {
        if (
          (k.endsWith('_at') || k.endsWith('_date') || k === 'timestamp' || k === 'valid_until') &&
          !isNaN(Date.parse(v))
        ) {
          obj[k] = new Date(v);
        }
      } else if (v && typeof v === 'object') {
        obj[k] = parseDates(v);
      }
    }
    return obj;
  }

  it('correctly matches nested relation criteria (project_approval.priority)', () => {
    const appRecord = {
      id: 'app-001',
      status: 'SUBMITTED',
      project_approval: {
        priority: 'HIGH',
        project: { district: 'Pune' },
      },
    };

    assert.strictEqual(
      matchesCondition(appRecord, {
        project_approval: { priority: 'HIGH' },
      }),
      true
    );

    assert.strictEqual(
      matchesCondition(appRecord, {
        project_approval: { priority: 'LOW' },
      }),
      false
    );

    assert.strictEqual(
      matchesCondition(appRecord, {
        project_approval: { project: { district: 'Pune' } },
      }),
      true
    );

    assert.strictEqual(
      matchesCondition(appRecord, {
        project_approval: { project: { district: 'Nagpur' } },
      }),
      false
    );
  });

  it('matches in-operator arrays correctly', () => {
    const query = { status: 'OPEN', id: 'q-1' };
    assert.strictEqual(matchesCondition(query, { status: { in: ['OPEN', 'RESPONDED'] } }), true);
    assert.strictEqual(matchesCondition(query, { status: { in: ['RESOLVED', 'CLOSED'] } }), false);
  });

  it('parses ISO date strings ending in _at, _date, and timestamp into Date instances', () => {
    const rawData = {
      id: 'app-001',
      submitted_at: '2025-01-15T00:00:00.000Z',
      due_date: '2025-02-15T00:00:00.000Z',
      nested: {
        updated_at: '2025-01-16T12:00:00.000Z',
        name: 'test',
      },
      tags: ['a', 'b'],
    };

    const parsed = parseDates(rawData);
    assert.ok(parsed.submitted_at instanceof Date);
    assert.ok(parsed.due_date instanceof Date);
    assert.ok(parsed.nested.updated_at instanceof Date);
    assert.strictEqual(typeof parsed.nested.name, 'string');
    assert.strictEqual(parsed.submitted_at.getTime(), new Date('2025-01-15T00:00:00.000Z').getTime());
  });

  it('properly guards against "undefined" and "null" strings in filter sanitization', () => {
    function sanitizeParam(val: unknown): string | undefined {
      if (typeof val !== 'string') return undefined;
      const t = val.trim();
      return !t || t === 'undefined' || t === 'null' || t === 'ALL' ? undefined : t;
    }

    assert.strictEqual(sanitizeParam('undefined'), undefined);
    assert.strictEqual(sanitizeParam('null'), undefined);
    assert.strictEqual(sanitizeParam(''), undefined);
    assert.strictEqual(sanitizeParam('   '), undefined);
    assert.strictEqual(sanitizeParam('ALL'), undefined);
    assert.strictEqual(sanitizeParam('SUBMITTED'), 'SUBMITTED');
  });
});
