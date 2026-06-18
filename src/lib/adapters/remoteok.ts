import axios from 'axios';
import { JobAdapter, RawJob } from './types';

export class RemoteOkAdapter implements JobAdapter {
  name = 'RemoteOK';

  async fetchJobs(): Promise<RawJob[]> {
    try {
      // RemoteOK doesn't have a direct "data engineering" category in its primary endpoint,
      // but we can try to filter by tag if supported, or just fetch all and rely on our strict filter.
      // Primary API is /api
      const response = await axios.get('https://remoteok.com/api?tag=data+engineer');
      if (!Array.isArray(response.data)) return [];

      return response.data.slice(1).map((job: any) => ({
        sourceName: this.name,
        sourceType: 'API',
        externalId: String(job.id),
        title: job.position,
        company: job.company,
        location: job.location,
        remote: true,
        applyUrl: job.url,
        descriptionText: job.description || '',
        seniority: '',
        postedAt: new Date(job.date),
      }));
    } catch (error) {
      console.error(`Error fetching from RemoteOK: ${error}`);
      return [];
    }
  }
}
