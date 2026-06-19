import axios from 'axios';
import { JobAdapter, RawJob } from './types';

export class RemotiveAdapter implements JobAdapter {
  name = 'Remotive';

  async fetchJobs(): Promise<RawJob[]> {
    try {
      // Increased count/search specificity for Remotive
      const response = await axios.get('https://remotive.com/api/remote-jobs?category=data&limit=100');
      if (!response.data || !Array.isArray(response.data.jobs)) return [];

      return response.data.jobs.map((job: any) => ({
        sourceName: this.name,
        sourceType: 'API',
        externalId: String(job.id),
        title: job.title,
        company: job.company_name,
        location: job.candidate_required_location,
        remote: true,
        applyUrl: job.url,
        descriptionText: job.description || '',
        seniority: '',
        postedAt: new Date(job.publication_date),
      }));
    } catch (error) {
      console.error(`Error fetching from Remotive: ${error}`);
      return [];
    }
  }
}
