import { Client } from "@elastic/elasticsearch";
import { env } from "../../config/env.js";

export const esClient = new Client({
  node: env.ELASTICSEARCH_NODE,
});

export const EMAILS_INDEX = "emails";

export interface EmailDocument {
  id: string;
  userId: string;
  senderId: string;
  recipient: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt: string;
  sentAt?: string | null;
  createdAt: string;
}

/**
 * Initializes the Elasticsearch emails index with optimized field mappings.
 */
export async function initElasticsearch(): Promise<boolean> {
  try {
    const exists = await esClient.indices.exists({ index: EMAILS_INDEX });
    if (!exists) {
      await esClient.indices.create({
        index: EMAILS_INDEX,
        mappings: {
          properties: {
            id: { type: "keyword" },
            userId: { type: "keyword" },
            senderId: { type: "keyword" },
            recipient: {
              type: "text",
              fields: { keyword: { type: "keyword" } },
            },
            subject: { type: "text" },
            body: { type: "text" },
            status: { type: "keyword" },
            scheduledAt: { type: "date" },
            sentAt: { type: "date" },
            createdAt: { type: "date" },
          },
        },
      });
      console.log(`[Elasticsearch] Created "${EMAILS_INDEX}" index.`);
    }
    return true;
  } catch (error) {
    console.warn(
      "[Elasticsearch] Initialization warning (skipping crash):",
      error instanceof Error ? error.message : error
    );
    return false;
  }
}

/**
 * Indexes or replaces an email document in Elasticsearch.
 */
export async function indexEmail(email: EmailDocument): Promise<void> {
  try {
    await esClient.index({
      index: EMAILS_INDEX,
      id: email.id,
      document: email,
      refresh: "wait_for", // Ensures immediate availability for search
    });
  } catch (error) {
    console.warn(
      `[Elasticsearch] Failed to index email ${email.id}:`,
      error instanceof Error ? error.message : error
    );
  }
}

/**
 * Updates status and sentAt in Elasticsearch after email is sent.
 */
export async function updateEmailInIndex(
  emailId: string,
  status: string,
  sentAt?: Date | null
): Promise<void> {
  try {
    await esClient.update({
      index: EMAILS_INDEX,
      id: emailId,
      doc: {
        status,
        sentAt: sentAt ? sentAt.toISOString() : null,
      },
      doc_as_upsert: true,
      refresh: "wait_for",
    });
  } catch (error) {
    console.warn(
      `[Elasticsearch] Failed to update email ${emailId} in index:`,
      error instanceof Error ? error.message : error
    );
  }
}

/**
 * Full-text search across subject, body, and recipient.
 */
export async function searchEmails(query: string, userId?: string) {
  try {
    const mustQueries: any[] = [];

    if (query && query.trim() !== "" && query.trim() !== "*") {
      mustQueries.push({
        multi_match: {
          query,
          fields: ["subject^3", "recipient^2", "body"],
          fuzziness: "AUTO",
        },
      });
    } else {
      mustQueries.push({ match_all: {} });
    }

    if (userId) {
      mustQueries.push({ term: { userId } });
    }

    const response = await esClient.search({
      index: EMAILS_INDEX,
      query: {
        bool: {
          must: mustQueries,
        },
      },
      sort: [{ createdAt: { order: "desc" } }],
    });

    const hits = response.hits.hits;
    const emails = hits.map((hit) => hit._source as EmailDocument);

    return {
      total: typeof response.hits.total === "number" ? response.hits.total : response.hits.total?.value || 0,
      emails,
    };
  } catch (error) {
    console.warn(
      "[Elasticsearch] Search query error:",
      error instanceof Error ? error.message : error
    );
    return { total: 0, emails: [] };
  }
}
