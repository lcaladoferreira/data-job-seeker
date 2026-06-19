import { Resend } from 'resend';
import { Job } from '@prisma/client';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendEmailNotification(job: Job) {
  if (!resend || !process.env.EMAIL_TO) return;

  const evidence = Array.isArray(job.worldwideEvidence) ? job.worldwideEvidence as string[] : [];

  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
      to: process.env.EMAIL_TO,
      subject: `[NEW JOB] ${job.title} at ${job.company}`,
      html: `
        <h1>New Worldwide Remote Job</h1>
        <p><strong>${job.title}</strong> at ${job.company}</p>
        <p>Evidence: ${evidence.join(', ')}</p>
        <p><a href="${job.applyUrl}">Apply here</a></p>
      `,
    });
  } catch (error) {
    console.error('Email failed:', error);
  }
}

export async function sendEmailDigest(jobs: Job[]) {
  if (!resend || jobs.length === 0 || !process.env.EMAIL_TO) {
    console.log(`Email skipped: ${!resend ? 'No API Key' : (jobs.length === 0 ? 'No Jobs' : 'No Recipient')}`);
    return;
  }

  const date = new Date().toLocaleDateString();
  const subject = `[Worldwide Data Jobs] ${jobs.length} New Worldwide Remote Opportunities - ${date}`;

  const jobHtml = jobs.map(job => {
    // Handle Json field
    const evidence = Array.isArray(job.worldwideEvidence) ? job.worldwideEvidence as string[] : [];

    return `
    <div style="margin-bottom: 30px; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background: white;">
      <h3 style="margin: 0; color: #1e40af;">${job.title}</h3>
      <p style="margin: 5px 0; font-weight: bold;">${job.company} - ${job.sourceName}</p>
      <p style="margin: 5px 0; color: #666; font-size: 14px;">📍 ${job.location || 'Remote Worldwide'}</p>
      <p style="margin: 5px 0; color: #059669; font-size: 12px;">Evidence: ${evidence.join(', ')}</p>
      <div style="margin-top: 10px;">
        <a href="${job.applyUrl}" style="background: #2563eb; color: white; padding: 8px 15px; border-radius: 5px; text-decoration: none; font-size: 14px; font-weight: bold;">Apply Now</a>
      </div>
    </div>
  `}).join('');

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 20px;">
      <h1 style="color: #111827;">Worldwide Data Jobs Digest</h1>
      <p style="color: #4b5563;">Here are the latest explicitly worldwide remote Data Engineering jobs found today.</p>
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
      ${jobHtml}
      <p style="font-size: 12px; color: #9ca3af; margin-top: 40px; text-align: center;">
        You are receiving this because you configured notifications for Worldwide Data Jobs Monitor.
      </p>
    </div>
  `;

  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
      to: process.env.EMAIL_TO,
      subject,
      html,
    });
    console.log(`Digest email sent for ${jobs.length} jobs.`);
  } catch (error) {
    console.error('Failed to send digest email:', error);
  }
}
