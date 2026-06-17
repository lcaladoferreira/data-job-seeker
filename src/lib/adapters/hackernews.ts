import axios from 'axios';
import { JobAdapter, RawJob } from './types';

export class HackerNewsAdapter implements JobAdapter {
  name = 'Hacker News';

  async fetchJobs(): Promise<RawJob[]> {
    try {
      const searchResponse = await axios.get('https://hn.algolia.com/api/v1/search?tags=story,author_whoishiring&query=hiring');
      const latestStory = searchResponse.data.hits[0];
      if (!latestStory || !latestStory.title.includes('Who is hiring')) return [];

      const storyResponse = await axios.get(`https://hacker-news.firebaseio.com/v0/item/${latestStory.objectID}.json`);
      const commentIds = storyResponse.data.kids || [];
      const jobs: RawJob[] = [];

      for (const id of commentIds.slice(0, 50)) {
        try {
          const commentResponse = await axios.get(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
          const comment = commentResponse.data;
          if (comment && comment.text && !comment.deleted && !comment.dead) {
            const text = comment.text;

            // Preliminary selective check for Hacker News to avoid heavy processing of unrelated roles
            const isRelevant =
                /data engineer/i.test(text) ||
                /analytics engineer/i.test(text) ||
                /data pipeline/i.test(text) ||
                /spark/i.test(text) ||
                /snowflake/i.test(text);

            if (!isRelevant) continue;

            const lines = text.split('<p>')[0].split('|');
            const company = lines[0]?.trim() || 'Unknown';
            const title = lines[1]?.trim() || 'Job Opening';

            if (text.toLowerCase().includes('remote')) {
              jobs.push({
                sourceName: this.name,
                sourceType: 'API',
                externalId: String(id),
                title,
                company,
                location: 'Remote',
                remote: true,
                applyUrl: `https://news.ycombinator.com/item?id=${id}`,
                descriptionText: text,
                seniority: '',
                postedAt: new Date(comment.time * 1000),
              });
            }
          }
        } catch (e) {
          continue;
        }
      }
      return jobs;
    } catch (error) {
      console.error(`Error fetching from Hacker News: ${error}`);
      return [];
    }
  }
}
