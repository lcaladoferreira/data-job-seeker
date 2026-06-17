export interface RawJob {
  sourceName: string;
  sourceType: string;
  externalId: string;
  title: string;
  company: string;
  location?: string;
  remote: boolean;
  applyUrl: string;
  descriptionText: string;
  seniority?: string;
  postedAt?: Date;
}

export interface JobAdapter {
  name: string;
  fetchJobs(): Promise<RawJob[]>;
}
