export type WorldwideStatus = "ACCEPTED" | "REJECTED";

export interface WorldwideEvaluation {
  status: WorldwideStatus;
  evidence: string[];
  rejectionReason: string;
  matchedRejectPatterns: string[];
}

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
  /hiring globally/i,
  /remote anywhere/i,
];

const REJECTION_PATTERNS = [
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
  /americas only/i,
  /must be located in/i,
  /must reside in/i,
  /authorized to work in/i,
  /work authorization required/i,
  /eligible locations:/i,
  /remote in the united states/i,
  /remote in europe/i,
  /remote in canada/i,
  /hybrid/i,
  /on-site/i,
  /onsite/i,
  /citizen only/i,
  /based in/i,
  /only hire in/i,
  /only hiring in/i,
  /limited to/i,
  /\bUS\b/, // Case-sensitive to avoid matching "us" pronoun
  /\bUSA\b/,
  /Canada/i,
  /Europe/i,
  /\bUK\b/,
  /timezone compatibility/i,
];

export function evaluateWorldwideEligibility(jobText: string): WorldwideEvaluation {
  const matchedEvidence: string[] = [];
  const matchedRejectPatterns: string[] = [];

  // Check for worldwide evidence
  for (const pattern of WORLDWIDE_EVIDENCE_PATTERNS) {
    const match = jobText.match(pattern);
    if (match) {
      matchedEvidence.push(match[0]);
    }
  }

  // Check for rejection patterns
  for (const pattern of REJECTION_PATTERNS) {
    const match = jobText.match(pattern);
    if (match) {
      matchedRejectPatterns.push(match[0]);
    }
  }

  // Decision logic
  if (matchedRejectPatterns.length > 0) {
    return {
      status: "REJECTED",
      evidence: matchedEvidence,
      rejectionReason: `Found restrictive patterns: ${matchedRejectPatterns.join(", ")}`,
      matchedRejectPatterns,
    };
  }

  if (matchedEvidence.length === 0) {
    return {
      status: "REJECTED",
      evidence: [],
      rejectionReason: "No explicit worldwide remote evidence found.",
      matchedRejectPatterns: [],
    };
  }

  return {
    status: "ACCEPTED",
    evidence: matchedEvidence,
    rejectionReason: "",
    matchedRejectPatterns: [],
  };
}
