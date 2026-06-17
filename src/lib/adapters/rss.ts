import axios from 'axios';
import { JobAdapter, RawJob } from './types';
import { XMLParser } from 'fast-xml-parser';

export class RSSAdapter implements JobAdapter {
  constructor(public name: string, private url: string) {}

  async fetchJobs(): Promise<RawJob[]> {
    try {
      const response = await axios.get(this.url);
      const parser = new XMLParser();
      const jsonObj = parser.parse(response.data);
      const items = jsonObj.rss?.channel?.item || jsonObj.feed?.entry;

      if (!items) return [];
      const itemsArray = Array.isArray(items) ? items : [items];

      return itemsArray.map((item: any) => ({
        sourceName: this.name,
        sourceType: 'RSS',
        externalId: item.guid?.['#text'] || item.guid || item.id || item.link,
        title: item.title?.['#text'] || item.title,
        company: 'Unknown',
        location: 'Remote',
        remote: true,
        applyUrl: item.link?.['@_href'] || item.link,
        descriptionText: item.description || item.content?.['#text'] || item.summary?.['#text'] || '',
        seniority: '',
        postedAt: item.pubDate ? new Date(item.pubDate) : (item.updated ? new Date(item.updated) : new Date()),
      }));
    } catch (error) {
      console.error(`Error fetching from RSS source ${this.name}: ${error}`);
      return [];
    }
  }
}
