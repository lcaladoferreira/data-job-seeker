export type WorldwideStatus = "ACCEPTED" | "REJECTED";

export interface WorldwideEvaluation {
  status: WorldwideStatus;
  evidence: string[];
  rejectionReason: string;
  matchedRejectPatterns: string[];
  matchedRoleKeywords: string[];
}

const DATA_ENGINEERING_TITLE_PATTERNS = [
  /\bData Engineer\b/i,
  /\bAnalytics Engineer\b/i,
  /\bData Platform Engineer\b/i,
  /\bBig Data Engineer\b/i,
  /\bData Infrastructure Engineer\b/i,
  /\bETL Developer\b/i,
  /\bELT Developer\b/i,
  /\bData Pipeline Engineer\b/i,
  /\bLakehouse Engineer\b/i,
  /\bDatabricks Engineer\b/i,
  /\bPySpark Engineer\b/i,
  /\bAirflow Engineer\b/i,
];

const DATA_ENGINEERING_KEYWORDS = [
  /\bPySpark\b/i,
  /\bSpark\b/i,
  /\bDatabricks\b/i,
  /\bAirflow\b/i,
  /\bdbt\b/i,
  /\bSnowflake\b/i,
  /\bBigQuery\b/i,
  /\bRedshift\b/i,
  /\bAWS Glue\b/i,
  /\bAzure Data Factory\b/i,
  /\bKafka\b/i,
  /\bDelta Lake\b/i,
  /\bLakehouse\b/i,
  /\bETL\b/i,
  /\bELT\b/i,
  /data pipeline/i,
  /data warehouse/i,
  /data lake/i,
];

const EXCLUDED_ROLE_PATTERNS = [
  /Product Engineer/i,
  /Software Engineer/i,
  /Frontend Engineer/i,
  /Backend Engineer/i,
  /Full Stack Engineer/i,
  /DevOps Engineer/i,
  /SRE/i,
  /QA Engineer/i,
  /AI Video Editor/i,
  /Video Editor/i,
  /Designer/i,
  /Product Manager/i,
  /Marketing/i,
  /Sales/i,
  /Customer Support/i,
  /Recruiter/i,
  /HR/i,
  /Finance/i,
  /Legal/i,
  /\bData Scientist\b/i, // Reject generic Data Scientist
  /\bData Analyst\b/i,    // Reject generic Data Analyst
  /\bMachine Learning Engineer\b/i, // Reject unless specialized
];

const WORLDWIDE_EVIDENCE_PATTERNS = [
  /remote worldwide/i,
  /worldwide remote/i,
  /work from anywhere/i,
  /anywhere in the world/i,
  /open to candidates worldwide/i,
  /applicants worldwide/i,
  /global remote/i,
  /remote globally/i,
  /no location restrictions/i,
  /location: worldwide/i,
  /distributed globally and hiring worldwide/i,
  /fully remote worldwide/i,
  /async global team/i,
];

const LOCAL_RESTRICTION_PATTERNS = [
  /us only/i,
  /usa only/i,
  /united states only/i,
  /us\/canada only/i,
  /north america only/i,
  /europe only/i,
  /eu only/i,
  /uk only/i,
  /emea only/i,
  /apac only/i,
  /australia only/i,
  /india only/i,
  /latam only/i,
  /brazil only/i,
  /brasil only/i,
  /americas only/i,
  /must be located in/i,
  /must reside in/i,
  /authorized to work in/i,
  /work authorization required/i,
  /eligible locations:/i,
  /remote in the united states/i,
  /remote in europe/i,
  /remote in canada/i,
  /remote brazil/i,
  /must be based in brazil/i,
  /must reside in brazil/i,
  /germany only/i,
  /São Paulo/i,
  /Sao Paulo/i,
  /Campinas/i,
  /hybrid/i,
  /on-site/i,
  /onsite/i,
  /relocation required/i,
  /\bUS\b/,
  /\bUSA\b/,
  /\bUK\b/,
  /\bIndia\b/i,
  /\bCanada\b/i,
  /\bBrazil\b/i,
  /\bBrasil\b/i,
  /timezone compatibility/i,
  /timezone overlap/i,
];

export function evaluateWorldwideEligibility(
  title: string,
  location: string = "",
  description: string = ""
): WorldwideEvaluation {
  const fullText = `${title} ${location} ${description}`;
  const matchedEvidence: string[] = [];
  const matchedRejectPatterns: string[] = [];
  const matchedRoleKeywords: string[] = [];

  // 1. Role Relevance Filter
  let isDataEngineering = false;
  let isExcludedRole = false;

  // Check for explicit title match
  for (const pattern of DATA_ENGINEERING_TITLE_PATTERNS) {
    if (pattern.test(title)) {
      isDataEngineering = true;
      matchedRoleKeywords.push(title.match(pattern)![0]);
      break;
    }
  }

  // Check for excluded roles (even if it has keywords) - Priority over DE title
  for (const pattern of EXCLUDED_ROLE_PATTERNS) {
    if (pattern.test(title)) {
      isExcludedRole = true;
      matchedRejectPatterns.push(title.match(pattern)![0]);
      break;
    }
  }

  // Check for strong keyword match if title didn't match DE but isn't excluded
  if (!isDataEngineering && !isExcludedRole) {
    let keywordCount = 0;
    for (const pattern of DATA_ENGINEERING_KEYWORDS) {
      const match = fullText.match(pattern);
      if (match) {
        keywordCount++;
        matchedRoleKeywords.push(match[0]);
      }
    }
    if (keywordCount >= 3) {
      isDataEngineering = true;
    }
  }

  // 2. Worldwide Remote Filter
  let hasWorldwideEvidence = false;
  for (const pattern of WORLDWIDE_EVIDENCE_PATTERNS) {
    const match = fullText.match(pattern);
    if (match) {
      hasWorldwideEvidence = true;
      matchedEvidence.push(match[0]);
    }
  }

  // 3. Local Restriction Filter
  for (const pattern of LOCAL_RESTRICTION_PATTERNS) {
    const match = fullText.match(pattern);
    if (match) {
      matchedRejectPatterns.push(match[0]);
    }
  }

  // Final Decision Logic
  if (isExcludedRole) {
    return {
      status: "REJECTED",
      evidence: matchedEvidence,
      rejectionReason: "EXCLUDED_ROLE",
      matchedRejectPatterns,
      matchedRoleKeywords,
    };
  }

  if (!isDataEngineering) {
    return {
      status: "REJECTED",
      evidence: matchedEvidence,
      rejectionReason: "NOT_DATA_ENGINEERING_ROLE",
      matchedRejectPatterns,
      matchedRoleKeywords,
    };
  }

  if (matchedRejectPatterns.length > 0) {
    return {
      status: "REJECTED",
      evidence: matchedEvidence,
      rejectionReason: "LOCAL_RESTRICTION",
      matchedRejectPatterns,
      matchedRoleKeywords,
    };
  }

  if (!hasWorldwideEvidence) {
    return {
      status: "REJECTED",
      evidence: [],
      rejectionReason: "NOT_WORLDWIDE_REMOTE",
      matchedRejectPatterns: [],
      matchedRoleKeywords,
    };
  }

  return {
    status: "ACCEPTED",
    evidence: matchedEvidence,
    rejectionReason: "",
    matchedRejectPatterns: [],
    matchedRoleKeywords,
  };
}
