function calculateRisk(fdr) {
  let score = 0;
  const reasons = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const maturityDate = new Date(fdr.maturityDate);

  if (Number.isNaN(maturityDate.getTime())) {
    return {
      score: null,
      level: "REVIEW REQUIRED",
      reasons: ["Invalid or missing maturity date"]
    };
  }

  const daysLeft = Math.ceil(
    (maturityDate - today) / (1000 * 60 * 60 * 24)
  );

  if (daysLeft < 0) {
    score += 40;
    reasons.push("FDR has expired");
  } else if (daysLeft <= 7) {
    score += 30;
    reasons.push("FDR matures within 7 days");
  } else if (daysLeft <= 30) {
    score += 15;
    reasons.push("FDR matures within 30 days");
  }

  if (fdr.validityGap) {
    score += 40;
    reasons.push("Required validity period may not be covered");
  }

  if (fdr.documentsMissing) {
    score += 15;
    reasons.push("Required documents are missing");
  }

  if (fdr.approvalOverdue) {
    score += 10;
    reasons.push("Approval is overdue");
  }

  score = Math.min(score, 100);

  let level = "LOW";

  if (score >= 60) {
    level = "HIGH";
  } else if (score >= 30) {
    level = "MEDIUM";
  }

  if (reasons.length === 0) {
    reasons.push("No configured risk conditions detected");
  }

  return {
    score,
    level,
    daysLeft,
    reasons
  };
}

module.exports = calculateRisk;