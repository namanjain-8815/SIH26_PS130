import crypto from 'crypto';
import { supabase } from './supabase';
import type {
  User,
  Organization,
  Department,
  Project,
  ProjectAttribute,
  ApprovalType,
  ApplicabilityRule,
  ApprovalDependency,
  ProjectApproval,
  DocumentRequirement,
  Document,
  Application,
  ApplicationDocument,
  ApplicationEvent,
  Query,
  QueryResponse,
  Inspection,
  InspectionFinding,
  SLAPolicy,
  SLAInstance,
  IncentiveScheme,
  IncentiveMatch,
  ComplianceRequirement,
  AuditLog,
  Notification,
} from '../types/database';

type AnyRecord = Record<string, any>;

interface RelationDef {
  table: string;
  foreignKey: string;
  isMany: boolean;
  isParent?: boolean;
}

const RELATION_MAP: Record<string, Record<string, RelationDef>> = {
  User: {
    organization: { table: 'Organization', foreignKey: 'org_id', isMany: false, isParent: true },
    department: { table: 'Department', foreignKey: 'department_id', isMany: false, isParent: true },
  },
  Project: {
    organization: { table: 'Organization', foreignKey: 'org_id', isMany: false, isParent: true },
    attributes: { table: 'ProjectAttribute', foreignKey: 'project_id', isMany: true },
    project_approvals: { table: 'ProjectApproval', foreignKey: 'project_id', isMany: true },
    documents: { table: 'Document', foreignKey: 'project_id', isMany: true },
    incentive_matches: { table: 'IncentiveMatch', foreignKey: 'project_id', isMany: true },
    compliance_requirements: { table: 'ComplianceRequirement', foreignKey: 'project_id', isMany: true },
  },
  ProjectApproval: {
    project: { table: 'Project', foreignKey: 'project_id', isMany: false, isParent: true },
    approval_type: { table: 'ApprovalType', foreignKey: 'approval_type_id', isMany: false, isParent: true },
    application: { table: 'Application', foreignKey: 'project_approval_id', isMany: false },
  },
  ApprovalType: {
    applicability_rules: { table: 'ApplicabilityRule', foreignKey: 'approval_type_id', isMany: true },
    document_requirements: { table: 'DocumentRequirement', foreignKey: 'approval_type_id', isMany: true },
    project_approvals: { table: 'ProjectApproval', foreignKey: 'approval_type_id', isMany: true },
    sla_policies: { table: 'SLAPolicy', foreignKey: 'approval_type_id', isMany: true },
    prerequisite_for: { table: 'ApprovalDependency', foreignKey: 'prerequisite_approval_type_id', isMany: true },
    dependent_on: { table: 'ApprovalDependency', foreignKey: 'dependent_approval_type_id', isMany: true },
  },
  ApplicabilityRule: {
    approval_type: { table: 'ApprovalType', foreignKey: 'approval_type_id', isMany: false, isParent: true },
  },
  ApprovalDependency: {
    prerequisite_approval: { table: 'ApprovalType', foreignKey: 'prerequisite_approval_type_id', isMany: false, isParent: true },
    dependent_approval: { table: 'ApprovalType', foreignKey: 'dependent_approval_type_id', isMany: false, isParent: true },
    prerequisite_approval_type: { table: 'ApprovalType', foreignKey: 'prerequisite_approval_type_id', isMany: false, isParent: true },
    dependent_approval_type: { table: 'ApprovalType', foreignKey: 'dependent_approval_type_id', isMany: false, isParent: true },
  },
  Application: {
    project_approval: { table: 'ProjectApproval', foreignKey: 'project_approval_id', isMany: false, isParent: true },
    department: { table: 'Department', foreignKey: 'department_id', isMany: false, isParent: true },
    application_documents: { table: 'ApplicationDocument', foreignKey: 'application_id', isMany: true },
    events: { table: 'ApplicationEvent', foreignKey: 'application_id', isMany: true },
    queries: { table: 'Query', foreignKey: 'application_id', isMany: true },
    inspections: { table: 'Inspection', foreignKey: 'application_id', isMany: true },
    sla_instance: { table: 'SLAInstance', foreignKey: 'application_id', isMany: false },
  },
  ApplicationDocument: {
    application: { table: 'Application', foreignKey: 'application_id', isMany: false, isParent: true },
    document: { table: 'Document', foreignKey: 'document_id', isMany: false, isParent: true },
  },
  Document: {
    project: { table: 'Project', foreignKey: 'project_id', isMany: false, isParent: true },
    organization: { table: 'Organization', foreignKey: 'org_id', isMany: false, isParent: true },
    application_documents: { table: 'ApplicationDocument', foreignKey: 'document_id', isMany: true },
  },
  ApplicationEvent: {
    application: { table: 'Application', foreignKey: 'application_id', isMany: false, isParent: true },
    actor: { table: 'User', foreignKey: 'actor_id', isMany: false, isParent: true },
  },
  Query: {
    application: { table: 'Application', foreignKey: 'application_id', isMany: false, isParent: true },
    creator: { table: 'User', foreignKey: 'created_by', isMany: false, isParent: true },
    assignee: { table: 'User', foreignKey: 'assigned_to', isMany: false, isParent: true },
    responses: { table: 'QueryResponse', foreignKey: 'query_id', isMany: true },
  },
  QueryResponse: {
    query: { table: 'Query', foreignKey: 'query_id', isMany: false, isParent: true },
    author: { table: 'User', foreignKey: 'created_by', isMany: false, isParent: true },
  },
  Inspection: {
    application: { table: 'Application', foreignKey: 'application_id', isMany: false, isParent: true },
    department: { table: 'Department', foreignKey: 'department_id', isMany: false, isParent: true },
    inspector: { table: 'User', foreignKey: 'inspector_id', isMany: false, isParent: true },
    findings: { table: 'InspectionFinding', foreignKey: 'inspection_id', isMany: true },
  },
  InspectionFinding: {
    inspection: { table: 'Inspection', foreignKey: 'inspection_id', isMany: false, isParent: true },
  },
  SLAPolicy: {
    approval_type: { table: 'ApprovalType', foreignKey: 'approval_type_id', isMany: false, isParent: true },
  },
  SLAInstance: {
    application: { table: 'Application', foreignKey: 'application_id', isMany: false, isParent: true },
  },
  IncentiveMatch: {
    project: { table: 'Project', foreignKey: 'project_id', isMany: false, isParent: true },
    incentive_scheme: { table: 'IncentiveScheme', foreignKey: 'incentive_scheme_id', isMany: false, isParent: true },
  },
  ComplianceRequirement: {
    project: { table: 'Project', foreignKey: 'project_id', isMany: false, isParent: true },
  },
  AuditLog: {
    actor: { table: 'User', foreignKey: 'actor_id', isMany: false, isParent: true },
  },
  Notification: {
    user: { table: 'User', foreignKey: 'user_id', isMany: false, isParent: true },
  },
};

function applyWhere(builder: any, where?: Record<string, any>, tableName?: string) {
  if (!where) return builder;

  const tableRelations = tableName ? RELATION_MAP[tableName] || {} : {};

  for (const [key, val] of Object.entries(where)) {
    if (val === undefined || val === 'undefined') continue;

    // Skip relations on this table so they don't corrupt root SQL query
    if (tableRelations[key]) {
      continue;
    }

    if (val === null) {
      builder = builder.is(key, null);
    } else if (typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
      if ('in' in val && Array.isArray(val.in)) {
        builder = builder.in(key, val.in);
      } else if ('not' in val) {
        if (val.not === null) {
          builder = builder.not(key, 'is', null);
        } else {
          builder = builder.neq(key, val.not);
        }
      } else if ('gte' in val) {
        builder = builder.gte(key, val.gte instanceof Date ? val.gte.toISOString() : val.gte);
      } else if ('lte' in val) {
        builder = builder.lte(key, val.lte instanceof Date ? val.lte.toISOString() : val.lte);
      } else if ('gt' in val) {
        builder = builder.gt(key, val.gt instanceof Date ? val.gt.toISOString() : val.gt);
      } else if ('lt' in val) {
        builder = builder.lt(key, val.lt instanceof Date ? val.lt.toISOString() : val.lt);
      } else {
        for (const [subKey, subVal] of Object.entries(val)) {
          if (subVal !== undefined && subVal !== 'undefined' && typeof subVal !== 'object') {
            builder = builder.eq(subKey, subVal);
          }
        }
      }
    } else if (val instanceof Date) {
      builder = builder.eq(key, val.toISOString());
    } else {
      builder = builder.eq(key, val);
    }
  }

  return builder;
}

function extractRelationFilters(where: Record<string, any> | undefined, tableName: string) {
  if (!where) return { directWhere: undefined, relationWhere: undefined };
  const tableRelations = RELATION_MAP[tableName] || {};
  const directWhere: Record<string, any> = {};
  const relationWhere: Record<string, any> = {};
  let hasRelation = false;

  for (const [k, v] of Object.entries(where)) {
    if (v === undefined || v === 'undefined') continue;
    if (tableRelations[k]) {
      relationWhere[k] = v;
      hasRelation = true;
    } else {
      directWhere[k] = v;
    }
  }

  return {
    directWhere: Object.keys(directWhere).length > 0 ? directWhere : undefined,
    relationWhere: hasRelation ? relationWhere : undefined,
  };
}

function buildIncludeFromRelationWhere(relationWhere?: Record<string, any>): Record<string, any> | undefined {
  if (!relationWhere) return undefined;
  const include: Record<string, any> = {};

  for (const [k, v] of Object.entries(relationWhere)) {
    if (
      v &&
      typeof v === 'object' &&
      !Array.isArray(v) &&
      !(v instanceof Date) &&
      !('in' in v || 'not' in v || 'gte' in v || 'lte' in v || 'gt' in v || 'lt' in v)
    ) {
      const nested = buildIncludeFromRelationWhere(v);
      include[k] = nested ? { include: nested } : true;
    } else {
      include[k] = true;
    }
  }
  return Object.keys(include).length > 0 ? include : undefined;
}

function selectToInclude(tableName: string, selectObj?: Record<string, any>): Record<string, any> | undefined {
  if (!selectObj) return undefined;
  const tableRelations = RELATION_MAP[tableName] || {};
  const include: Record<string, any> = {};
  let hasRelation = false;

  for (const [key, val] of Object.entries(selectObj)) {
    if (tableRelations[key] && typeof val === 'object') {
      hasRelation = true;
      const targetTable = tableRelations[key].table;
      if (val.select) {
        const nested = selectToInclude(targetTable, val.select);
        include[key] = nested ? { include: nested } : true;
      } else if (val.include) {
        include[key] = val;
      } else {
        include[key] = true;
      }
    }
  }

  return hasRelation ? include : undefined;
}

function mergeIncludes(incA?: Record<string, any>, incB?: Record<string, any>): Record<string, any> | undefined {
  if (!incA && !incB) return undefined;
  if (!incA) return incB;
  if (!incB) return incA;

  const result: Record<string, any> = { ...incA };
  for (const [k, v] of Object.entries(incB)) {
    if (!result[k]) {
      result[k] = v;
    } else if (typeof result[k] === 'object' && typeof v === 'object') {
      const nestedA = result[k].include || {};
      const nestedB = v.include || {};
      result[k] = {
        ...result[k],
        ...v,
        include: mergeIncludes(nestedA, nestedB),
      };
    }
  }
  return result;
}

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
    if ('gt' in cond) {
      const c = cond.gt instanceof Date ? cond.gt.getTime() : cond.gt;
      const v =
        val instanceof Date
          ? val.getTime()
          : typeof val === 'string' && !isNaN(Date.parse(val))
          ? new Date(val).getTime()
          : val;
      return v > c;
    }
    if ('lt' in cond) {
      const c = cond.lt instanceof Date ? cond.lt.getTime() : cond.lt;
      const v =
        val instanceof Date
          ? val.getTime()
          : typeof val === 'string' && !isNaN(Date.parse(val))
          ? new Date(val).getTime()
          : val;
      return v < c;
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

function applyOrderBy(builder: any, orderBy?: any) {
  if (!orderBy) return builder;

  if (Array.isArray(orderBy)) {
    for (const item of orderBy) {
      for (const [col, dir] of Object.entries(item)) {
        builder = builder.order(col, { ascending: dir === 'asc' });
      }
    }
  } else if (typeof orderBy === 'object') {
    for (const [col, dir] of Object.entries(orderBy)) {
      builder = builder.order(col, { ascending: dir === 'asc' });
    }
  }

  return builder;
}

async function hydrateRelations(
  sourceTable: string,
  records: AnyRecord[],
  include?: Record<string, any>
) {
  if (!include || records.length === 0) return;

  const tableRelations = RELATION_MAP[sourceTable] || {};

  for (const [relationName, relationInclude] of Object.entries(include)) {
    if (!relationInclude) continue;

    const rel = tableRelations[relationName];
    if (!rel) continue;

    const nestedInclude = typeof relationInclude === 'object' && relationInclude.include ? relationInclude.include : undefined;
    const nestedWhere = typeof relationInclude === 'object' && relationInclude.where ? relationInclude.where : undefined;
    const nestedOrderBy = typeof relationInclude === 'object' && relationInclude.orderBy ? relationInclude.orderBy : undefined;

    if (rel.isParent) {
      const foreignIds = Array.from(new Set(records.map((r) => r[rel.foreignKey]).filter(Boolean)));
      if (foreignIds.length > 0) {
        let q = supabase.from(rel.table).select('*').in('id', foreignIds);
        q = applyWhere(q, nestedWhere, rel.table);
        q = applyOrderBy(q, nestedOrderBy);
        const { data: targets, error } = await q;
        if (error) throw error;

        const targetMap = new Map((targets || []).map((t: any) => [t.id, t]));
        for (const r of records) {
          r[relationName] = targetMap.get(r[rel.foreignKey]) ?? null;
        }

        if (nestedInclude && targets && targets.length > 0) {
          await hydrateRelations(rel.table, targets, nestedInclude);
        }
      } else {
        for (const r of records) {
          r[relationName] = null;
        }
      }
    } else if (rel.isMany) {
      const parentIds = Array.from(new Set(records.map((r) => r.id).filter(Boolean)));
      if (parentIds.length > 0) {
        let q = supabase.from(rel.table).select('*').in(rel.foreignKey, parentIds);
        q = applyWhere(q, nestedWhere, rel.table);
        q = applyOrderBy(q, nestedOrderBy);
        const { data: targets, error } = await q;
        if (error) throw error;

        const grouped = new Map<string, any[]>();
        for (const t of targets || []) {
          const pId = t[rel.foreignKey];
          if (!grouped.has(pId)) grouped.set(pId, []);
          grouped.get(pId)!.push(t);
        }

        for (const r of records) {
          r[relationName] = grouped.get(r.id) ?? [];
        }

        if (nestedInclude && targets && targets.length > 0) {
          await hydrateRelations(rel.table, targets, nestedInclude);
        }
      } else {
        for (const r of records) {
          r[relationName] = [];
        }
      }
    } else {
      const parentIds = Array.from(new Set(records.map((r) => r.id).filter(Boolean)));
      if (parentIds.length > 0) {
        let q = supabase.from(rel.table).select('*').in(rel.foreignKey, parentIds);
        q = applyWhere(q, nestedWhere, rel.table);
        q = applyOrderBy(q, nestedOrderBy);
        const { data: targets, error } = await q;
        if (error) throw error;

        const targetMap = new Map((targets || []).map((t: any) => [t[rel.foreignKey], t]));
        for (const r of records) {
          r[relationName] = targetMap.get(r.id) ?? null;
        }

        if (nestedInclude && targets && targets.length > 0) {
          await hydrateRelations(rel.table, targets, nestedInclude);
        }
      } else {
        for (const r of records) {
          r[relationName] = null;
        }
      }
    }
  }
}

export class ModelClient<T = any> {
  constructor(public readonly tableName: string) {}

  async findMany(args?: {
    where?: Record<string, any>;
    include?: Record<string, any>;
    orderBy?: any;
    take?: number;
    skip?: number;
    select?: any;
  }): Promise<T[]> {
    const { directWhere, relationWhere } = extractRelationFilters(args?.where, this.tableName);

    let q = supabase.from(this.tableName).select('*');
    q = applyWhere(q, directWhere, this.tableName);
    q = applyOrderBy(q, args?.orderBy);

    if (!relationWhere) {
      if (args?.take !== undefined && args?.skip !== undefined) {
        q = q.range(args.skip, args.skip + args.take - 1);
      } else if (args?.take !== undefined) {
        q = q.limit(args.take);
      }
    }

    const { data, error } = await q;
    if (error) throw error;

    let list = (data || []) as T[];

    const selectInclude = selectToInclude(this.tableName, args?.select);
    const whereInclude = buildIncludeFromRelationWhere(relationWhere);
    const combinedInclude = mergeIncludes(mergeIncludes(args?.include, selectInclude), whereInclude);

    if (combinedInclude && list.length > 0) {
      await hydrateRelations(this.tableName, list as AnyRecord[], combinedInclude);
    }

    if (relationWhere) {
      list = list.filter((item) => matchesCondition(item, relationWhere));
      if (args?.skip !== undefined || args?.take !== undefined) {
        const start = args.skip || 0;
        const end = args.take !== undefined ? start + args.take : undefined;
        list = list.slice(start, end);
      }
    }

    parseDates(list);
    return list;
  }

  async findUnique(args: {
    where: Record<string, any>;
    include?: Record<string, any>;
    select?: any;
  }): Promise<T | null> {
    const results = await this.findMany({
      where: args.where,
      include: args.include,
      select: args.select,
      take: 1,
    });
    return results[0] ?? null;
  }

  async findFirst(args?: {
    where?: Record<string, any>;
    include?: Record<string, any>;
    orderBy?: any;
    select?: any;
  }): Promise<T | null> {
    const results = await this.findMany({
      where: args?.where,
      include: args?.include,
      orderBy: args?.orderBy,
      select: args?.select,
      take: 1,
    });
    return results[0] ?? null;
  }

  async count(args?: { where?: Record<string, any> }): Promise<number> {
    const { directWhere, relationWhere } = extractRelationFilters(args?.where, this.tableName);
    if (!relationWhere) {
      let q = supabase.from(this.tableName).select('*', { count: 'exact', head: true });
      q = applyWhere(q, directWhere, this.tableName);
      const { count, error } = await q;
      if (!error && count !== null) return count;
    }
    const items = await this.findMany({ where: args?.where });
    return items.length;
  }

  async create(args: {
    data: Record<string, any>;
    include?: Record<string, any>;
  }): Promise<T> {
    const row = { ...args.data };
    if (!row.id) {
      row.id = crypto.randomUUID();
    }
    const { data, error } = await supabase
      .from(this.tableName)
      .insert(row)
      .select()
      .single();

    if (error) throw error;

    if (args.include) {
      await hydrateRelations(this.tableName, [data as AnyRecord], args.include);
    }

    parseDates(data);
    return data as T;
  }

  async createMany(args: { data: Record<string, any>[] }): Promise<{ count: number }> {
    const rows = args.data.map((item) => ({
      id: item.id || crypto.randomUUID(),
      ...item,
    }));
    const { data, error } = await supabase
      .from(this.tableName)
      .insert(rows)
      .select();

    if (error) throw error;
    return { count: data?.length || 0 };
  }

  async update(args: {
    where: Record<string, any>;
    data: Record<string, any>;
    include?: Record<string, any>;
  }): Promise<T> {
    let q = supabase.from(this.tableName).update(args.data);
    q = applyWhere(q, args.where, this.tableName);

    const { data, error } = await q.select().single();
    if (error) throw error;

    if (args.include) {
      await hydrateRelations(this.tableName, [data as AnyRecord], args.include);
    }

    parseDates(data);
    return data as T;
  }

  async updateMany(args: {
    where: Record<string, any>;
    data: Record<string, any>;
  }): Promise<{ count: number }> {
    let q = supabase.from(this.tableName).update(args.data);
    q = applyWhere(q, args.where, this.tableName);

    const { data, error } = await q.select();
    if (error) throw error;
    return { count: data?.length || 0 };
  }

  async delete(args: { where: Record<string, any> }): Promise<T | null> {
    let q = supabase.from(this.tableName).delete();
    q = applyWhere(q, args.where, this.tableName);

    const { data, error } = await q.select().maybeSingle();
    if (error) throw error;
    if (data) parseDates(data);
    return data as T | null;
  }

  async deleteMany(args?: { where?: Record<string, any> }): Promise<{ count: number }> {
    let q = supabase.from(this.tableName).delete();
    q = applyWhere(q, args?.where, this.tableName);

    const { data, error } = await q.select();
    if (error) throw error;
    return { count: data?.length || 0 };
  }

  async upsert(args: {
    where: Record<string, any>;
    create: Record<string, any>;
    update: Record<string, any>;
    include?: Record<string, any>;
  }): Promise<T> {
    const existing = await this.findFirst({ where: args.where });
    if (existing) {
      if (Object.keys(args.update).length === 0) {
        if (args.include) {
          await hydrateRelations(this.tableName, [existing as AnyRecord], args.include);
        }
        return existing as T;
      }
      return this.update({ where: { id: (existing as any).id }, data: args.update, include: args.include });
    } else {
      const createData = { ...args.create, ...args.update };
      if (!createData.id) {
        createData.id = crypto.randomUUID();
      }
      return this.create({ data: createData, include: args.include });
    }
  }

  async groupBy(args: {
    by: string[];
    where?: Record<string, any>;
    _count?: Record<string, boolean>;
  }): Promise<any[]> {
    const items = await this.findMany({ where: args.where });
    const groupKey = args.by[0];
    const counts = new Map<any, number>();

    for (const item of items) {
      const val = (item as any)[groupKey];
      counts.set(val, (counts.get(val) || 0) + 1);
    }

    return Array.from(counts.entries()).map(([k, count]) => ({
      [groupKey]: k,
      _count: { _all: count, [groupKey]: count },
    }));
  }
}

export const db = {
  user: new ModelClient<User>('User'),
  organization: new ModelClient<Organization>('Organization'),
  department: new ModelClient<Department>('Department'),
  project: new ModelClient<Project>('Project'),
  projectAttribute: new ModelClient<ProjectAttribute>('ProjectAttribute'),
  approvalType: new ModelClient<ApprovalType>('ApprovalType'),
  applicabilityRule: new ModelClient<ApplicabilityRule>('ApplicabilityRule'),
  approvalDependency: new ModelClient<ApprovalDependency>('ApprovalDependency'),
  projectApproval: new ModelClient<ProjectApproval>('ProjectApproval'),
  documentRequirement: new ModelClient<DocumentRequirement>('DocumentRequirement'),
  document: new ModelClient<Document>('Document'),
  application: new ModelClient<Application>('Application'),
  applicationDocument: new ModelClient<ApplicationDocument>('ApplicationDocument'),
  applicationEvent: new ModelClient<ApplicationEvent>('ApplicationEvent'),
  query: new ModelClient<Query>('Query'),
  queryResponse: new ModelClient<QueryResponse>('QueryResponse'),
  inspection: new ModelClient<Inspection>('Inspection'),
  inspectionFinding: new ModelClient<InspectionFinding>('InspectionFinding'),
  sLAPolicy: new ModelClient<SLAPolicy>('SLAPolicy'),
  sLAInstance: new ModelClient<SLAInstance>('SLAInstance'),
  incentiveScheme: new ModelClient<IncentiveScheme>('IncentiveScheme'),
  incentiveMatch: new ModelClient<IncentiveMatch>('IncentiveMatch'),
  complianceRequirement: new ModelClient<ComplianceRequirement>('ComplianceRequirement'),
  auditLog: new ModelClient<AuditLog>('AuditLog'),
  notification: new ModelClient<Notification>('Notification'),

  async $disconnect(): Promise<void> {},

  async $transaction<T>(arg: Promise<T>[] | ((tx: typeof db) => Promise<T>)): Promise<T | T[]> {
    if (Array.isArray(arg)) {
      return Promise.all(arg);
    }
    return arg(db);
  },
};

export { supabase };
