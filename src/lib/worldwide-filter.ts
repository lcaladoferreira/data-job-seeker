export type WorldwideStatus = "ACCEPTED" | "REJECTED";

export interface WorldwideEvaluation {
  status: WorldwideStatus;
  evidence: string[];
  rejectionReason: string;
  matchedRejectPatterns: string[];
  matchedRoleKeywords: string[];
}

// STRICT WHITELIST for Data Engineering roles
const DATA_ENGINEERING_TITLE_PATTERNS = [
  /\bData Engineer\b/i,
  /\bSenior Data Engineer\b/i,
  /\bStaff Data Engineer\b/i,
  /\bLead Data Engineer\b/i,
  /\bPrincipal Data Engineer\b/i,
  /\bAnalytics Engineer\b/i,
  /\bBig Data Engineer\b/i,
  /\bCloud Data Engineer\b/i,
  /\bPlatform Data Engineer\b/i,
  /\bData Infrastructure Engineer\b/i,
  /\bETL (Developer|Engineer)\b/i,
  /\bELT (Developer|Engineer)\b/i,
  /\bData Pipeline Engineer\b/i,
];

// STRICT BLACKLIST for roles to reject immediately
const EXCLUDED_ROLE_PATTERNS = [
  /Video Editor/i,
  /Cinematic/i,
  /Designer/i,
  /Developer Advocate/i,
  /Product Manager/i,
  /Product Engineer/i,
  /Software Engineer/i,
  /Frontend/i,
  /Backend/i,
  /Full Stack/i,
  /Fullstack/i,
  /DevOps/i,
  /SRE/i,
  /QA/i,
  /Data Analyst/i,
  /Data Scientist/i,
  /Machine Learning/i,
  /ML Engineer/i,
  /AI Engineer/i,
  /Prompt Engineer/i,
  /Marketing/i,
  /Sales/i,
  /Customer Success/i,
  /Support/i,
  /HR/i,
  /Recruiter/i,
  /Operations/i,
  /Finance/i,
  /Legal/i,
  /Account Manager/i,
  /Creative Director/i,
  /Content Creator/i,
  /Copywriter/i,
  /Social Media/i,
  /Virtual Assistant/i,
];

// Evidence of WORLDWIDE remote
const WORLDWIDE_EVIDENCE_PATTERNS = [
  /Remote Worldwide/i,
  /Worldwide Remote/i,
  /\bWorldwide\b/i,
  /\bGlobal\b/i,
  /\bAnywhere\b/i,
  /Work from anywhere/i,
  /Anywhere in the world/i,
  /Open to all countries/i,
  /International applicants welcome/i,
  /Open to candidates worldwide/i,
  /Distributed globally and hiring worldwide/i,
  /No location restrictions/i,
];

// Hard rejection patterns for regional restrictions
const LOCAL_RESTRICTION_PATTERNS = [
  /\bUS Only\b/i,
  /\bUSA Only\b/i,
  /\bUnited States Only\b/i,
  /\bEU Only\b/i,
  /\bUK Only\b/i,
  /\bUK\b/,
  /\bCanada Only\b/i,
  /\bBrazil Only\b/i,
  /\bBrasil Only\b/i,
  /\bIndia Only\b/i,
  /\bAustralia Only\b/i,
  /\bNorth America Only\b/i,
  /\bEurope Only\b/i,
  /\bEMEA Only\b/i,
  /\bAPAC Only\b/i,
  /\bLATAM Only\b/i,
  /\bAmericas Only\b/i,
  /\bMexico Only\b/i,
  /\bGermany Only\b/i,
  /\bFrance Only\b/i,
  /Visa unavailable/i,
  /Work authorization required/i,
  /Must reside in/i,
  /Must be located in/i,
  /Must be based in/i,
  /Citizens only/i,
  /Residents only/i,
  /Eligible to work in/i,
  /Authorized to work in/i,
  /Timezone overlap only/i, // Added as per "reject" implication in core rule
  /Remote in the United States/i,
  /Remote in Europe/i,
  /Remote in Canada/i,
  /Remote Brazil/i,
  /\bSão Paulo\b/i,
  /\bSao Paulo\b/i,
  /\bRio de Janeiro\b/i,
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

  // 1. Role Gatekeeper - EXCLUSION FIRST
  for (const pattern of EXCLUDED_ROLE_PATTERNS) {
    if (pattern.test(title) || pattern.test(location)) {
      matchedRejectPatterns.push((title.match(pattern) || location.match(pattern))![0]);
      return {
        status: "REJECTED",
        evidence: [],
        rejectionReason: "EXCLUDED_ROLE",
        matchedRejectPatterns,
        matchedRoleKeywords,
      };
    }
  }

  // Check for explicit title match against whitelist
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

  // 2. Local Restriction Filter - FORCE REJECT
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
    evidence: matchedEvidence,
    rejectionReason: "",
    matchedRejectPatterns: [],
    matchedRoleKeywords,
  };
}
