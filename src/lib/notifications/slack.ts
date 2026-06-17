import axios from 'axios';
import { Job } from '@prisma/client';
import { prisma } from '../prisma';

export async function sendSlackNotification(job: Job) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  const message = {
    text: `🚀 *New Worldwide Remote Job Found!*`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `🚀 *New Worldwide Remote Job Found!*\n\n*${job.title}* at *${job.company}*`,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Source:* ${job.sourceName}` },
          { type: 'mrkdwn', text: `*Evidence:* ${job.worldwideEvidence.join(', ')}` },
        ],
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'View Job' },
            url: job.applyUrl,
          },
        ],
      },
    ],
  };

  try {
    await axios.post(webhookUrl, message);
    await prisma.job.update({
      where: { id: job.id },
      data: { alertedSlackAt: new Date() },
    });
    await prisma.alertLog.create({
      data: {
        jobId: job.id,
        type: 'SLACK',
        status: 'SUCCESS',
      },
    });
  } catch (error: any) {
    await prisma.alertLog.create({
      data: {
        jobId: job.id,
        type: 'SLACK',
        status: 'FAILED',
        error: error.message,
      },
    });
  }
}
