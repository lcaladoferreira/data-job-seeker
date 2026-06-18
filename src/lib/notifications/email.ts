import { Resend } from 'resend';
import { Job } from '@prisma/client';
import { prisma } from '../prisma';

export async function sendEmailDigest(jobs: Job[]) {
  if (jobs.length === 0) return;

  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM;
  const toEmail = process.env.EMAIL_TO;

  if (!resendApiKey || !fromEmail || !toEmail) {
    console.warn('Email config missing, skipping digest');
    return;
  }

  const resend = new Resend(resendApiKey);

  const jobsHtml = jobs.map(job => `
    <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #eee; border-radius: 8px;">
      <h2 style="margin: 0;"><a href="${process.env.NEXT_PUBLIC_APP_URL || ''}/jobs/${job.id}" style="color: #2563eb; text-decoration: none;">${job.title}</a></h2>
      <p style="margin: 5px 0; font-weight: bold;">${job.company} - ${job.sourceName}</p>
      <p style="margin: 5px 0; color: #666; font-size: 14px;">📍 ${job.location || 'Remote Worldwide'}</p>
      <p style="margin: 5px 0; color: #059669; font-size: 12px;">Evidence: ${job.worldwideEvidence.join(', ')}</p>
      <div style="margin-top: 10px;">
        <a href="${job.applyUrl}" style="background: #2563eb; color: white; padding: 8px 15px; border-radius: 5px; text-decoration: none; font-size: 14px; font-weight: bold;">Apply Now</a>
      </div>
    </div>
  `).join('');

  try {
    await resend.emails.send({
      from: fromEmail,
      to: toEmail,
      subject: `[Worldwide Data Jobs] Digest: ${jobs.length} New Opportunities`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #111827; border-bottom: 2px solid #eee; padding-bottom: 10px;">New Worldwide Remote Jobs</h1>
          <p style="color: #4b5563;">We found ${jobs.length} new roles that passed our strict worldwide remote data engineering filter.</p>
          ${jobsHtml}
          <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #9ca3af; font-size: 12px; text-align: center;">
            Worldwide Data Jobs Monitor
          </footer>
        </div>
      `,
    });

    const now = new Date();
    for (const job of jobs) {
      await prisma.job.update({
        where: { id: job.id },
        data: { alertedEmailAt: now },
      });
      await prisma.alertLog.create({
        data: {
          jobId: job.id,
          type: 'EMAIL_DIGEST',
          status: 'SUCCESS',
        },
      });
    }
  } catch (error: any) {
    console.error('Failed to send email digest:', error);
    for (const job of jobs) {
      await prisma.alertLog.create({
        data: {
          jobId: job.id,
          type: 'EMAIL_DIGEST',
          status: 'FAILED',
          error: error.message,
        },
      });
    }
  }
}

// Keep single notification for manual resend button
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
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h1 style="color: #111827; margin-bottom: 20px;">New Worldwide Job!</h1>
          <p><strong>Title:</strong> ${job.title}</p>
          <p><strong>Company:</strong> ${job.company}</p>
          <p><strong>Source:</strong> ${job.sourceName}</p>
          <p><strong>Worldwide Evidence:</strong> ${job.worldwideEvidence.join(', ')}</p>
          <div style="margin-top: 30px;">
            <a href="${job.applyUrl}" style="background: #2563eb; color: white; padding: 12px 20px; border-radius: 5px; text-decoration: none; font-weight: bold;">Apply Now</a>
          </div>
        </div>
      `,
    });

    await prisma.job.update({
      where: { id: job.id },
      data: { alertedEmailAt: new Date() },
    });
    await prisma.alertLog.create({
      data: {
        jobId: job.id,
        type: 'EMAIL_SINGLE',
        status: 'SUCCESS',
      },
    });
  } catch (error: any) {
    await prisma.alertLog.create({
      data: {
        jobId: job.id,
        type: 'EMAIL_SINGLE',
        status: 'FAILED',
        error: error.message,
      },
    });
  }
}
