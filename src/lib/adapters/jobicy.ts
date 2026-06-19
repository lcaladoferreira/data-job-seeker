import axios from 'axios';
import { JobAdapter, RawJob } from './types';

export class JobicyAdapter implements JobAdapter {
  name = 'Jobicy';

  async fetchJobs(): Promise<RawJob[]> {
    try {
      // Fetching specifically for data engineering to increase yield
      const response = await axios.get('https://jobicy.com/api/v2/remote-jobs?count=50&industry=data-engineering');
      if (!response.data || !Array.isArray(response.data.jobs)) {
        // Fallback to general data category if industry specific fails
        const fallback = await axios.get('https://jobicy.com/api/v2/remote-jobs?count=100&category=data');
        if (!fallback.data || !Array.isArray(fallback.data.jobs)) return [];
        return this.mapJobs(fallback.data.jobs);
      }
      return this.mapJobs(response.data.jobs);
    } catch (error) {
      console.error(`Error fetching from Jobicy: ${error}`);
      return [];
    }
  }

  private mapJobs(jobs: any[]): RawJob[] {
    return jobs.map((job: any) => ({
      sourceName: this.name,
      sourceType: 'API',
      externalId: String(job.id),
      title: job.jobTitle,
      company: job.companyName,
      location: job.jobGeo,
      remote: true,
      applyUrl: job.url,
      descriptionText: job.jobDescription || '',
      seniority: job.jobLevel || '',
      postedAt: new Date(job.pubDate),
    }));
  }
}
