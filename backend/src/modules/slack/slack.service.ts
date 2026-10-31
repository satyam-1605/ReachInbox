import { env } from "../../config/env.js";
import { prisma } from "../../config/db.js";

export function generateSlackOAuthUrl(userId?: string): string {
  const params = new URLSearchParams({
    client_id: env.SLACK_CLIENT_ID,
    scope: "chat:write,chat:write.public,channels:read,incoming-webhook",
    redirect_uri: env.SLACK_REDIRECT_URI,
    ...(userId ? { state: userId } : {}),
  });

  return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
}

export interface SlackOAuthResponse {
  ok: boolean;
  access_token?: string;
  incoming_webhook?: {
    channel?: string;
    channel_id?: string;
    url?: string;
  };
  team?: {
    id?: string;
    name?: string;
  };
  error?: string;
}

export async function exchangeSlackCodeAndSave(
  code: string,
  userId: string
): Promise<boolean> {
  const params = new URLSearchParams({
    client_id: env.SLACK_CLIENT_ID,
    client_secret: env.SLACK_CLIENT_SECRET,
    code,
    redirect_uri: env.SLACK_REDIRECT_URI,
  });

  const response = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const data = (await response.json()) as SlackOAuthResponse;
  if (!data.ok || !data.access_token) {
    throw new Error(data.error || "Failed to exchange Slack OAuth code");
  }

  const channelId =
    data.incoming_webhook?.channel_id || data.incoming_webhook?.channel || "general";
  const teamId = data.team?.id || null;

  await prisma.slackConnection.upsert({
    where: { userId },
    update: {
      accessToken: data.access_token,
      channelId,
      teamId,
    },
    create: {
      userId,
      accessToken: data.access_token,
      channelId,
      teamId,
    },
  });

  return true;
}

export async function getSlackStatus(userId: string) {
  const connection = await prisma.slackConnection.findUnique({
    where: { userId },
  });

  return {
    connected: !!connection,
    channelId: connection?.channelId || null,
    teamId: connection?.teamId || null,
  };
}

export async function disconnectSlack(userId: string) {
  await prisma.slackConnection.deleteMany({
    where: { userId },
  });
  return { message: "Slack disconnected successfully" };
}

/**
 * Sends a real Slack notification via Slack API.
 * Hard rule (AGENTS.md):
 * - If Slack is not connected, skip silently. Never crash.
 * - If Slack is connected, send real API call.
 */
export async function sendSlackRateLimitAlert(
  senderName: string,
  senderEmail: string,
  window: string,
  userId: string
): Promise<{ sent: boolean; reason?: string }> {
  try {
    const connection = await prisma.slackConnection.findUnique({
      where: { userId },
    });

    if (!connection || !connection.accessToken) {
      // Rule: Not connected: skip silently.
      return { sent: false, reason: "slack_not_connected" };
    }

    const message = `⚠️ *ReachInbox Rate Limit Alert*\nSender: *${senderName}* (<${senderEmail}>)\nHourly limit reached for window *${window}*.\nScheduled jobs have been automatically rescheduled to the next hour window. Zero emails were dropped.`;

    const channel = connection.channelId || "general";

    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${connection.accessToken}`,
      },
      body: JSON.stringify({
        channel,
        text: message,
      }),
    });

    const result = (await response.json()) as { ok: boolean; error?: string };
    if (!result.ok) {
      console.warn(`[Slack API] Message delivery returned error: ${result.error}`);
      return { sent: false, reason: result.error };
    }

    console.log(`[Slack API] Rate limit notification sent to channel ${channel}`);
    return { sent: true };
  } catch (error) {
    // Rule: Never crash on Slack failure.
    console.warn(
      "[Slack API] Failed to send alert (skipping silently):",
      error instanceof Error ? error.message : error
    );
    return { sent: false, reason: "network_error" };
  }
}

