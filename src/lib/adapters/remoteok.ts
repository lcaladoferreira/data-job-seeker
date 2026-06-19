import axios from 'axios';
import { JobAdapter, RawJob } from './types';

export class RemoteOkAdapter implements JobAdapter {
  name = 'RemoteOK';

  async fetchJobs(): Promise<RawJob[]> {
    try {
      // RemoteOK API can be finicky with user agents and redirects.
      // We'll use a specific tag to find relevant jobs.
      const response = await axios.get('https://remoteok.com/api?tag=data+engineer', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (!Array.isArray(response.data)) return [];

      // First item is legal info
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
