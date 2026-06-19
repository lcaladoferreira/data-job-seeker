import axios from 'axios';
import { JobAdapter, RawJob } from './types';
import { XMLParser } from 'fast-xml-parser';

export class RSSAdapter implements JobAdapter {
  constructor(public name: string, private url: string) {}

  async fetchJobs(): Promise<RawJob[]> {
    try {
      const response = await axios.get(this.url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 10000
      });
      const parser = new XMLParser({ ignoreAttributes: false });
      const jsonObj = parser.parse(response.data);
      const items = jsonObj.rss?.channel?.item || jsonObj.feed?.entry;

      if (!items) return [];
      const itemsArray = Array.isArray(items) ? items : [items];

      return itemsArray.map((item: any) => {
        const title = item.title?.['#text'] || item.title || '';
        const link = item.link?.['@_href'] || item.link || '';
        const desc = item.description || item.content?.['#text'] || item.summary?.['#text'] || '';

        // Better company extraction for common RSS patterns
        let company = 'Unknown';
        if (title.includes(' at ')) {
            company = title.split(' at ').pop()?.trim() || 'Unknown';
        } else if (title.includes(' | ')) {
            company = title.split(' | ').pop()?.trim() || 'Unknown';
        } else if (desc.includes('<strong>Company:</strong>')) {
            company = desc.match(/<strong>Company:<\/strong>\s*(.*?)</)?.[1] || 'Unknown';
        }

        return {
          sourceName: this.name,
          sourceType: 'RSS',
          externalId: item.guid?.['#text'] || item.guid || item.id || link,
          title: title.split(' at ')[0].split(' | ')[0].trim(),
          company: company,
          location: 'Remote',
          remote: true,
          applyUrl: link,
          descriptionText: desc,
          seniority: '',
          postedAt: item.pubDate ? new Date(item.pubDate) : (item.updated ? new Date(item.updated) : new Date()),
        };
      });
    } catch (error) {
      console.error(`Error fetching from RSS source ${this.name}: ${error}`);
      return [];
    }
  }
}
