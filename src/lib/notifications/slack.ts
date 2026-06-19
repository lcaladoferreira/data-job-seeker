import axios from 'axios';
import { Job } from '@prisma/client';

export async function sendSlackNotification(job: Job) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  const evidence = Array.isArray(job.worldwideEvidence) ? job.worldwideEvidence as string[] : [];

  const message = {
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: '🌍 New Worldwide Remote Job Found!' },
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*${job.title}* at _${job.company}_` },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Source:* ${job.sourceName}` },
          { type: 'mrkdwn', text: `*Evidence:* ${evidence.join(', ')}` },
        ],
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `<${job.applyUrl}|View Original Listing>` },
      },
      {
        type: 'divider',
      },
    ],
  };

  try {
    await axios.post(webhookUrl, message);
    console.log(`Slack notification sent for job: ${job.id}`);
  } catch (error) {
    console.error('Failed to send Slack notification:', error);
  }
}
