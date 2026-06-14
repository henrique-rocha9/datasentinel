// ML service layer types. Real artifacts will be dropped into
// ml/risk_model/ and ml/clustering_model/ post-MVP.

export type RiskLevel = "low" | "medium" | "high";

export interface RiskFeatures {
  [key: string]: number | string | boolean | null | undefined;
}

export interface RiskPrediction {
  risk_level: RiskLevel;
  risk_score: number; // 0..1
  probabilities: Record<RiskLevel, number>;
}

export interface ClusterFeatures {
  [key: string]: number | string | boolean | null | undefined;
}

export interface ClusterPrediction {
  cluster_id: number;
  cluster_name: string;
  cluster_characteristics: Record<string, number | string>;
}
