// Mock clustering service.
// Replace internals with a real artifact loaded from ml/clustering_model/.

import type { ClusterFeatures, ClusterPrediction } from "./types";

const CLUSTERS: Array<{ id: number; name: string; characteristics: Record<string, string> }> = [
  { id: 0, name: "Thermal stress", characteristics: { dominant_signal: "temperature", trend: "rising" } },
  { id: 1, name: "Mechanical wear", characteristics: { dominant_signal: "vibration", trend: "cyclic" } },
  { id: 2, name: "Electrical anomaly", characteristics: { dominant_signal: "current", trend: "spiky" } },
  { id: 3, name: "Stable", characteristics: { dominant_signal: "none", trend: "flat" } },
];

function hash(features: ClusterFeatures): number {
  const s = JSON.stringify(features ?? {});
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function predictCluster(features: ClusterFeatures): ClusterPrediction {
  const c = CLUSTERS[hash(features) % CLUSTERS.length];
  return {
    cluster_id: c.id,
    cluster_name: c.name,
    cluster_characteristics: c.characteristics,
  };
}
