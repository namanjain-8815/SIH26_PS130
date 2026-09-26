import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Approval Dependency & DAG Logic (Unit Tests)', () => {
  interface Node {
    id: string;
    approval_type_id: string;
    status: 'NOT_APPLIED' | 'IN_PROGRESS' | 'COMPLETED';
  }

  interface Edge {
    prerequisite_approval_type_id: string;
    dependent_approval_type_id: string;
    dependency_type: 'PREREQUISITE' | 'SEQUENTIAL' | 'PARALLEL';
  }

  function canStartNow(
    node: Node,
    nodes: Node[],
    edges: Edge[]
  ): boolean {
    if (node.status === 'COMPLETED') return false;
    const nodeMap = new Map(nodes.map((n) => [n.approval_type_id, n]));
    const prereqs = edges.filter(
      (e) => e.dependent_approval_type_id === node.approval_type_id && e.dependency_type === 'PREREQUISITE'
    );
    return prereqs.every((e) => {
      const prereqNode = nodeMap.get(e.prerequisite_approval_type_id);
      return prereqNode?.status === 'COMPLETED';
    });
  }

  function topologicalSort(nodes: Node[], edges: Edge[]): string[] {
    const inDegree = new Map<string, number>();
    const adj = new Map<string, string[]>();

    for (const n of nodes) {
      inDegree.set(n.approval_type_id, 0);
      adj.set(n.approval_type_id, []);
    }

    for (const e of edges) {
      if (adj.has(e.prerequisite_approval_type_id) && inDegree.has(e.dependent_approval_type_id)) {
        adj.get(e.prerequisite_approval_type_id)!.push(e.dependent_approval_type_id);
        inDegree.set(e.dependent_approval_type_id, inDegree.get(e.dependent_approval_type_id)! + 1);
      }
    }

    const queue: string[] = [];
    for (const [id, deg] of inDegree.entries()) {
      if (deg === 0) queue.push(id);
    }

    const order: string[] = [];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      order.push(curr);
      for (const neighbor of adj.get(curr) || []) {
        inDegree.set(neighbor, inDegree.get(neighbor)! - 1);
        if (inDegree.get(neighbor) === 0) {
          queue.push(neighbor);
        }
      }
    }

    return order;
  }

  it('correctly detects approvals that can start now when prerequisites are completed', () => {
    const nodes: Node[] = [
      { id: '1', approval_type_id: 'at-pollution', status: 'COMPLETED' },
      { id: '2', approval_type_id: 'at-factory', status: 'NOT_APPLIED' },
      { id: '3', approval_type_id: 'at-fssai', status: 'NOT_APPLIED' },
    ];

    const edges: Edge[] = [
      {
        prerequisite_approval_type_id: 'at-pollution',
        dependent_approval_type_id: 'at-factory',
        dependency_type: 'PREREQUISITE',
      },
      {
        prerequisite_approval_type_id: 'at-factory',
        dependent_approval_type_id: 'at-fssai',
        dependency_type: 'PREREQUISITE',
      },
    ];

    // at-pollution is completed, so at-factory CAN start
    assert.strictEqual(canStartNow(nodes[1], nodes, edges), true);

    // at-factory is NOT completed, so at-fssai CANNOT start
    assert.strictEqual(canStartNow(nodes[2], nodes, edges), false);

    // at-pollution is already completed, so canStartNow is false
    assert.strictEqual(canStartNow(nodes[0], nodes, edges), false);
  });

  it('orders prerequisite approval chains topologically without cycles', () => {
    const nodes: Node[] = [
      { id: '1', approval_type_id: 'at-env-clearance', status: 'COMPLETED' },
      { id: '2', approval_type_id: 'at-pollution', status: 'IN_PROGRESS' },
      { id: '3', approval_type_id: 'at-building-plan', status: 'NOT_APPLIED' },
      { id: '4', approval_type_id: 'at-factory', status: 'NOT_APPLIED' },
    ];

    const edges: Edge[] = [
      {
        prerequisite_approval_type_id: 'at-env-clearance',
        dependent_approval_type_id: 'at-pollution',
        dependency_type: 'PREREQUISITE',
      },
      {
        prerequisite_approval_type_id: 'at-pollution',
        dependent_approval_type_id: 'at-factory',
        dependency_type: 'PREREQUISITE',
      },
      {
        prerequisite_approval_type_id: 'at-building-plan',
        dependent_approval_type_id: 'at-factory',
        dependency_type: 'PREREQUISITE',
      },
    ];

    const sorted = topologicalSort(nodes, edges);
    assert.strictEqual(sorted.length, 4);

    // at-env-clearance and at-building-plan must precede at-factory
    const factoryIdx = sorted.indexOf('at-factory');
    const envIdx = sorted.indexOf('at-env-clearance');
    const pollutionIdx = sorted.indexOf('at-pollution');
    const buildingIdx = sorted.indexOf('at-building-plan');

    assert.ok(envIdx < pollutionIdx);
    assert.ok(pollutionIdx < factoryIdx);
    assert.ok(buildingIdx < factoryIdx);
  });
});
