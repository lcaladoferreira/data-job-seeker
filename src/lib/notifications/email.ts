import { Resend } from 'resend';
import { Job } from '@prisma/client';
import { prisma } from '../prisma';

export async function sendEmailNotification(job: Job) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM;
  const toEmail = process.env.EMAIL_TO;

  if (!resendApiKey || !fromEmail || !toEmail) return;

  const resend = new Resend(resendApiKey);

  try {
    await resend.emails.send({
      from: fromEmail,
      to: toEmail,
      subject: `New Worldwide Job: ${job.title} at ${job.company}`,
      html: `
        <h1>New Worldwide Remote Job Found!</h1>
        <p><strong>Title:</strong> ${job.title}</p>
        <p><strong>Company:</strong> ${job.company}</p>
        <p><strong>Source:</strong> ${job.sourceName}</p>
        <p><strong>Worldwide Evidence:</strong> ${job.worldwideEvidence.join(', ')}</p>
        <p><a href="${job.applyUrl}">View Original Posting</a></p>
      `,
    });

    await prisma.job.update({
      where: { id: job.id },
      data: { alertedEmailAt: new Date() },
    });
    await prisma.alertLog.create({
      data: {
        jobId: job.id,
        type: 'EMAIL',
        status: 'SUCCESS',
      },
    });
  } catch (error: any) {
    await prisma.alertLog.create({
      data: {
        jobId: job.id,
        type: 'EMAIL',
        status: 'FAILED',
        error: error.message,
      },
    });
  }
}
