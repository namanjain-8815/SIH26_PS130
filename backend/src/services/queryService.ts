import { prisma } from '../lib/prisma';
import { NotFoundError } from '../lib/errors';

export async function listQueries(applicationId: string) {
  return prisma.query.findMany({
    where: { application_id: applicationId },
    include: {
      responses: { orderBy: { created_at: 'asc' } },
      creator: { select: { id: true, name: true, role: true } },
      assignee: { select: { id: true, name: true, role: true } },
    },
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
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { project_approval: { include: { approval_type: true, project: true } } },
  });
  if (!application) throw new NotFoundError('Application not found');

  const query = await prisma.$transaction(async (tx) => {
    const q = await tx.query.create({
      data: { application_id: applicationId, created_by: createdBy, ...data },
    });

    await tx.applicationEvent.create({
      data: { application_id: applicationId, actor_id: createdBy, event_type: 'query_raised', notes: data.subject },
    });

    // Update application status to QUERY_RAISED
    await tx.application.update({ where: { id: applicationId }, data: { status: 'QUERY_RAISED' } });

    // Notify the assignee (or entrepreneur) about the query
    const assigneeId = data.assigned_to;
    if (assigneeId) {
      await tx.notification.create({
        data: {
          user_id: assigneeId,
          title: `Query Raised — ${application.project_approval.approval_type.name}`,
          message: `A query has been raised on your application (${application.application_number}): "${data.subject}". Please respond before ${data.deadline?.toDateString() ?? 'the deadline'}.`,
          type: 'warning',
        },
      });
    }

    return q;
  });

  return query;
}

export async function respondToQuery(queryId: string, respondedBy: string, responseText: string) {
  const query = await prisma.query.findUnique({
    where: { id: queryId },
    include: { application: true },
  });
  if (!query) throw new NotFoundError('Query not found');

  return prisma.$transaction(async (tx) => {
    const response = await tx.queryResponse.create({
      data: { query_id: queryId, created_by: respondedBy, response_text: responseText },
    });
    await tx.query.update({ where: { id: queryId }, data: { status: 'RESPONDED' } });
    await tx.applicationEvent.create({
      data: { application_id: query.application_id, actor_id: respondedBy, event_type: 'query_responded', notes: `Response to: "${query.subject}"` },
    });
    // Notify query creator
    await tx.notification.create({
      data: {
        user_id: query.created_by,
        title: 'Query Response Received',
        message: `The applicant has responded to your query: "${query.subject}" on application ${query.application.application_number}.`,
        type: 'info',
      },
    });
    return response;
  });
}

export async function updateQueryStatus(
  queryId: string,
  actorId: string,
  status: 'OPEN' | 'RESPONDED' | 'UNDER_REVIEW' | 'RESOLVED' | 'ESCALATED'
) {
  const query = await prisma.query.findUnique({ where: { id: queryId } });
  if (!query) throw new NotFoundError('Query not found');

  return prisma.$transaction(async (tx) => {
    const updated = await tx.query.update({ where: { id: queryId }, data: { status } });
    if (status === 'RESOLVED') {
      await tx.applicationEvent.create({
        data: {
          application_id: query.application_id,
          actor_id: actorId,
          event_type: 'query_resolved',
          notes: `Query resolved: "${query.subject}"`,
        },
      });
    }
    return updated;
  });
}
