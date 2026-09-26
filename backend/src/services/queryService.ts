import { prisma } from '../lib/prisma';
import { NotFoundError } from '../lib/errors';

export async function listQueries(applicationId: string) {
  return prisma.query.findMany({
    where: { application_id: applicationId },
    include: { responses: true },
    orderBy: { created_at: 'desc' },
  });
}

export async function raiseQuery(
  applicationId: string,
  createdBy: string,
  data: {
    subject: string;
    description: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    deadline?: Date;
    assigned_to?: string;
  }
) {
  const query = await prisma.query.create({
    data: { application_id: applicationId, created_by: createdBy, ...data },
  });
  await prisma.applicationEvent.create({
    data: { application_id: applicationId, actor_id: createdBy, event_type: 'query_raised', notes: data.subject },
  });
  return query;
}

export async function respondToQuery(queryId: string, respondedBy: string, responseText: string) {
  const query = await prisma.query.findUnique({ where: { id: queryId } });
  if (!query) throw new NotFoundError('Query not found');

  const [response] = await prisma.$transaction([
    prisma.queryResponse.create({ data: { query_id: queryId, created_by: respondedBy, response_text: responseText } }),
    prisma.query.update({ where: { id: queryId }, data: { status: 'RESPONDED' } }),
    prisma.applicationEvent.create({
      data: { application_id: query.application_id, actor_id: respondedBy, event_type: 'query_responded' },
    }),
  ]);
  return response;
}

export async function updateQueryStatus(
  queryId: string,
  status: 'OPEN' | 'RESPONDED' | 'UNDER_REVIEW' | 'RESOLVED' | 'ESCALATED'
) {
  return prisma.query.update({ where: { id: queryId }, data: { status } });
}
