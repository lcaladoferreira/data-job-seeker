export type WorldwideStatus = "ACCEPTED" | "REJECTED";

export interface WorldwideEvaluation {
  status: WorldwideStatus;
  evidence: string[];
  rejectionReason: string;
  matchedRejectPatterns: string[];
  matchedRoleKeywords: string[];
}

const DATA_ENGINEERING_TITLE_PATTERNS = [
  /\bSenior Data Engineer\b/i,
  /\bLead Data Engineer\b/i,
  /\bStaff Data Engineer\b/i,
  /\bPrincipal Data Engineer\b/i,
  /\bData Engineer\b/i,
  /\bAnalytics Engineer\b/i,
  /\bData Platform Engineer\b/i,
  /\bBig Data Engineer\b/i,
  /\bETL (Developer|Engineer)\b/i,
  /\bELT (Developer|Engineer)\b/i,
  /\bSpark Engineer\b/i,
  /\bCloud Data Engineer\b/i,
  /\bData Infrastructure Engineer\b/i,
  /\bData Pipeline Engineer\b/i,
  /\bData Architect\b/i,
];

const EXCLUDED_ROLE_PATTERNS = [
  /\bData Analyst\b/i,
  /\bBusiness Analyst\b/i,
  /\bData Scientist\b/i,
  /\bMachine Learning\b/i,
  /\bAI Trainer\b/i,
  /\bData Labeling\b/i,
  /\bSearch Evaluator\b/i,
  /\bMarketing Analyst\b/i,
  /\bProduct Analyst\b/i,
  /\bBI Developer\b/i,
  /\bBI Engineer\b/i,
  /\bBusiness Intelligence\b/i,
  /\bVideo Editor\b/i,
];

const WORLDWIDE_EVIDENCE_PATTERNS = [
  /Remote Worldwide/i,
  /Worldwide Remote/i,
  /\bWorldwide\b/i,
  /\bAnywhere\b/i,
  /Work from anywhere/i,
  /Anywhere in the world/i,
  /Open to candidates worldwide/i,
  /Applicants worldwide/i,
  /Global remote/i,
  /Remote globally/i,
  /No location restrictions/i,
  /Location: Worldwide/i,
  /Distributed globally/i,
  /Hiring worldwide/i,
  /Fully remote, global/i,
];

const LOCAL_RESTRICTION_PATTERNS = [
  /\bUS Only\b/i,
  /\bUSA Only\b/i,
  /\bUnited States Only\b/i,
  /\bEU Only\b/i,
  /\bUK Only\b/i,
  /\bCanada Only\b/i,
  /\bBrazil Only\b/i,
  /\bNorth America Only\b/i,
  /\bEurope Only\b/i,
  /\bEMEA Only\b/i,
  /\bAPAC Only\b/i,
  /\bLATAM Only\b/i,
  /\bAmericas Only\b/i,
  /Must reside in/i,
  /Must be located in/i,
  /Work authorization required/i,
  /Authorized to work in/i,
  /Remote in the United States/i,
  /Remote in Europe/i,
  /Remote in Canada/i,
  /Remote in Brazil/i,
  /\bRemote Brazil\b/i,
  /\bRemote US\b/i,
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

  // Check for excluded roles FIRST in title
  for (const pattern of EXCLUDED_ROLE_PATTERNS) {
    if (pattern.test(title)) {
      matchedRejectPatterns.push(title.match(pattern)![0]);
      return {
        status: "REJECTED",
        evidence: [],
        rejectionReason: "EXCLUDED_ROLE",
        matchedRejectPatterns,
        matchedRoleKeywords,
      };
    }
  }

  // 1. Role Check
  let isDataEngineering = false;
  for (const pattern of DATA_ENGINEERING_TITLE_PATTERNS) {
    if (pattern.test(title)) {
      isDataEngineering = true;
      matchedRoleKeywords.push(title.match(pattern)![0]);
      break;
    }
  }

  if (!isDataEngineering) {
    return {
      status: "REJECTED",
      evidence: [],
      rejectionReason: "NOT_A_DATA_ENGINEERING_ROLE",
      matchedRejectPatterns: [],
      matchedRoleKeywords: [],
    };
  }

  // 2. Local Restriction Filter
  for (const pattern of LOCAL_RESTRICTION_PATTERNS) {
    const match = fullText.match(pattern);
    if (match) {
      matchedRejectPatterns.push(match[0]);
    }
  }

  if (matchedRejectPatterns.length > 0) {
    return {
      status: "REJECTED",
      evidence: [],
      rejectionReason: "LOCAL_RESTRICTION",
      matchedRejectPatterns,
      matchedRoleKeywords,
    };
  }

  // 3. Worldwide Evidence Requirement
  let hasWorldwideEvidence = false;
  for (const pattern of WORLDWIDE_EVIDENCE_PATTERNS) {
    const match = fullText.match(pattern);
    if (match) {
      hasWorldwideEvidence = true;
      matchedEvidence.push(match[0]);
    }
  }

  // If location is "Worldwide" or "Anywhere" specifically
  if (!hasWorldwideEvidence) {
      if (location.toLowerCase().includes('worldwide') || location.toLowerCase().includes('anywhere')) {
          hasWorldwideEvidence = true;
          matchedEvidence.push(location);
      }
  }

  if (!hasWorldwideEvidence) {
    return {
      status: "REJECTED",
      evidence: [],
      rejectionReason: "NO_WORLDWIDE_EVIDENCE",
      matchedRejectPatterns: [],
      matchedRoleKeywords,
    };
  }

  return {
    status: "ACCEPTED",
    evidence: Array.from(new Set(matchedEvidence)),
    rejectionReason: "",
    matchedRejectPatterns: [],
    matchedRoleKeywords,
  };
}
