export function formatPointLoss(value) {
  const numericValue = Number(value) || 0;
  const unit = Math.abs(numericValue) === 1 ? "point" : "points";
  if (numericValue === 0) {
    return "0 " + unit;
  }

  return "-" + numericValue + " " + unit;
}
