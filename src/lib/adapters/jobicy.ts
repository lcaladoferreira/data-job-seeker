import axios from 'axios';
import { JobAdapter, RawJob } from './types';

export class JobicyAdapter implements JobAdapter {
  name = 'Jobicy';

  async fetchJobs(): Promise<RawJob[]> {
    try {
      const response = await axios.get('https://jobicy.com/api/v2/remote-jobs?count=50&geo=anywhere');
      if (!response.data || !Array.isArray(response.data.jobs)) return [];

      return response.data.jobs.map((job: any) => ({
        sourceName: this.name,
        sourceType: 'API',
        externalId: String(job.id),
        title: job.jobTitle,
        company: job.companyName,
        location: job.jobGeo,
        remote: true,
        applyUrl: job.url,
        descriptionText: job.jobDescription || '',
        seniority: job.jobLevel,
        postedAt: new Date(job.pubDate),
      }));
    } catch (error) {
      console.error(`Error fetching from Jobicy: ${error}`);
      return [];
    }
  }
}
