// Real risk classification service.
//
// Implements the Logistic Regression model selected in
// ml/notebooks/datasentinel_selecao_modelos.ipynb (multinomial / softmax,
// trained on ml/datasets/dataset_produto_final.csv with class_weight="balanced").
//
// Coefficients were exported via sklearn and serialized to
// ml/risk_model/logreg_artifact.json. To swap in a re-trained artifact later,
// regenerate that JSON and update the LOGREG constant below — the calling
// surface (predictRisk / predictRiskProba) is unchanged.
//
// Feature order (must match training):
//   media_score_risco, media_defeitos, percentual_os_altas, total_os_log
// Classes: 0 = low, 1 = medium, 2 = high.

import type { RiskFeatures, RiskLevel, RiskPrediction } from "./types";

const LOGREG = {
  features: ["media_score_risco", "media_defeitos", "percentual_os_altas", "total_os_log"] as const,
  // classes_[i] -> RISK_LEVELS[i]
  classes: [0, 1, 2] as const,
  // coef_[k][j] for class k and feature j
  coef: [
    [-7.26356964487891, 0.09462230787477971, -3.999403916230121, -2.690558368872724],
    [0.4460964572510232, -0.19145553775403695, -2.7188535562343548, 0.6851295639092386],
    [6.817473187627922, 0.09683322987926618, 6.718257472464418, 2.0054288049634126],
  ],
  intercept: [25.712678708833348, -0.19008130132107112, -25.522597407513842],
};

const RISK_LEVELS: RiskLevel[] = ["low", "medium", "high"];

function toNumber(v: unknown): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Build the feature vector in the exact training order, applying the same
 * transformations used by the notebook:
 *   - total_os_log = ln(1 + total_os) when only total_os is supplied
 *   - percentual_os_altas is clipped to [0, 1]
 *   - all features are non-negative (clipped at 0)
 */
function buildFeatureVector(features: RiskFeatures): number[] {
  const f = (features ?? {}) as Record<string, unknown>;

  let totalOsLog = f.total_os_log !== undefined ? toNumber(f.total_os_log) : NaN;
  if (!Number.isFinite(totalOsLog)) {
    const totalOs = toNumber(f.total_os);
    totalOsLog = Math.log1p(Math.max(0, totalOs));
  }

  let percentual = toNumber(f.percentual_os_altas);
  if (percentual < 0) percentual = 0;
  if (percentual > 1) percentual = 1;

  const mediaScore = Math.max(0, toNumber(f.media_score_risco));
  const mediaDefeitos = Math.max(0, toNumber(f.media_defeitos));
  totalOsLog = Math.max(0, totalOsLog);

  return [mediaScore, mediaDefeitos, percentual, totalOsLog];
}

function softmax(logits: number[]): number[] {
  const max = Math.max(...logits);
  const exps = logits.map((z) => Math.exp(z - max));
  const sum = exps.reduce((a, b) => a + b, 0) || 1;
  return exps.map((e) => e / sum);
}

export function predictRiskProba(features: RiskFeatures): Record<RiskLevel, number> {
  const x = buildFeatureVector(features);
  const logits = LOGREG.coef.map((w, k) => {
    let z = LOGREG.intercept[k];
    for (let j = 0; j < w.length; j++) z += w[j] * x[j];
    return z;
  });
  const probs = softmax(logits);
  const out = { low: 0, medium: 0, high: 0 } as Record<RiskLevel, number>;
  for (let i = 0; i < LOGREG.classes.length; i++) {
    out[RISK_LEVELS[i]] = Number(probs[i].toFixed(4));
  }
  return out;
}

export function predictRisk(features: RiskFeatures): RiskPrediction {
  const probabilities = predictRiskProba(features);
  const risk_level = Object.entries(probabilities).sort((a, b) => b[1] - a[1])[0][0] as RiskLevel;
  const risk_score = Number((probabilities.high * 1 + probabilities.medium * 0.5).toFixed(4));
  return { risk_level, risk_score, probabilities };
}
