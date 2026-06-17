import axios from 'axios';
import { JobAdapter, RawJob } from './types';

export class ArbeitnowAdapter implements JobAdapter {
  name = 'Arbeitnow';

  async fetchJobs(): Promise<RawJob[]> {
    try {
      const response = await axios.get('https://www.arbeitnow.com/api/job-board-api');
      if (!response.data || !Array.isArray(response.data.data)) return [];

      return response.data.data
        .filter((job: any) => job.remote)
        .map((job: any) => ({
          sourceName: this.name,
          sourceType: 'API',
          externalId: job.slug,
          title: job.title,
          company: job.company_name,
          location: job.location,
          remote: true,
          applyUrl: job.url,
          descriptionText: job.description || '',
          seniority: '',
          postedAt: new Date(job.created_at * 1000),
        }));
    } catch (error) {
      console.error(`Error fetching from Arbeitnow: ${error}`);
      return [];
    }
  }
}
