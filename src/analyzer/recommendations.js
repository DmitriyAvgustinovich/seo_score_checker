import { SEVERITY_WEIGHTS } from "../constants/weights.js";

export function getTopFixes(issues, pageData) {
  return issues
    .filter((issue) => !issue.passed && !issue.infoOnly)
    .map((issue) => {
      const commercialBonus =
        pageData.commercialIntent.detected &&
        (issue.section === "metadata" || issue.section === "indexability")
          ? 5
          : 0;

      const priority = (SEVERITY_WEIGHTS[issue.severity] || 0) * 10 + (issue.scoreImpact || 0) + commercialBonus;

      return {
        ...issue,
        priority
      };
    })
    .sort((left, right) => {
      if (right.priority !== left.priority) {
        return right.priority - left.priority;
      }

      return (right.scoreImpact || 0) - (left.scoreImpact || 0);
    })
    .slice(0, 3);
}
