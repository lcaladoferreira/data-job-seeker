import axios from 'axios';
import { JobAdapter, RawJob } from './types';
import { XMLParser } from 'fast-xml-parser';

export class WWRAdapter implements JobAdapter {
  name = 'We Work Remotely';

  async fetchJobs(): Promise<RawJob[]> {
    try {
      const response = await axios.get('https://weworkremotely.com/categories/remote-data-science-analysis-jobs.rss');
      const parser = new XMLParser();
      const jsonObj = parser.parse(response.data);
      const items = jsonObj.rss?.channel?.item;

      if (!items) return [];
      const itemsArray = Array.isArray(items) ? items : [items];

      return itemsArray.map((item: any) => ({
        sourceName: this.name,
        sourceType: 'RSS',
        externalId: item.guid?.['#text'] || item.guid || item.link,
        title: item.title,
        company: item.description?.match(/at (.*?)<\/p>/)?.[1] || 'Unknown',
        location: 'Remote',
        remote: true,
        applyUrl: item.link,
        descriptionText: item.description || '',
        seniority: '',
        postedAt: new Date(item.pubDate),
      }));
    } catch (error) {
      console.error(`Error fetching from WWR: ${error}`);
      return [];
    }
  }
}
