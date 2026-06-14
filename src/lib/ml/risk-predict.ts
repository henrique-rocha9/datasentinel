// Mock risk prediction service.
// Replace internals with a real XGBoost artifact loaded from ml/risk_model/.

import type { RiskFeatures, RiskLevel, RiskPrediction } from "./types";

function hash(features: RiskFeatures): number {
  const s = JSON.stringify(features ?? {});
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function predictRiskProba(features: RiskFeatures): Record<RiskLevel, number> {
  const h = hash(features);
  const a = (h % 1000) / 1000;
  const b = ((h >> 3) % 1000) / 1000;
  const raw = { low: 1 - a, medium: a * (1 - b), high: a * b };
  const sum = raw.low + raw.medium + raw.high || 1;
  return {
    low: Number((raw.low / sum).toFixed(4)),
    medium: Number((raw.medium / sum).toFixed(4)),
    high: Number((raw.high / sum).toFixed(4)),
  };
}

export function predictRisk(features: RiskFeatures): RiskPrediction {
  const probabilities = predictRiskProba(features);
  const risk_level = (Object.entries(probabilities).sort((x, y) => y[1] - x[1])[0][0]) as RiskLevel;
  const risk_score = Number(
    (probabilities.high * 1 + probabilities.medium * 0.5).toFixed(4),
  );
  return { risk_level, risk_score, probabilities };
}
