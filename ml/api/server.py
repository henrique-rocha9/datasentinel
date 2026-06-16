import io
import time
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sklearn.cluster import KMeans
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    silhouette_score,
    davies_bouldin_score,
    calinski_harabasz_score,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import RobustScaler
from xgboost import XGBClassifier

app = FastAPI(title="Datasentinel ML API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"],
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).parent.parent

# ── Risk model ────────────────────────────────────────────────────────────────
RISK_DATASET_PATH = BASE_DIR / "datasets" / "dataset_produto_demo.csv"
RISK_MODEL_PATH   = BASE_DIR / "risk_model" / "risk_model.joblib"
RISK_FEATURES     = ["media_score_risco", "media_defeitos", "percentual_os_altas", "total_os_log"]

# ── Clustering model ──────────────────────────────────────────────────────────
OS_DATASET_PATH      = BASE_DIR / "datasets" / "dataset_os.csv"
CLUSTER_MODEL_PATH   = BASE_DIR / "clustering_model" / "clustering_model.joblib"
CLUSTER_FEATURES     = [
    "qtd_defeitos_constatados",
    "teve_troca_peca",
    "em_garantia",
    "complexidade_os",
    "retrabalho_flag",
    "tempo_aberto_log",
]
CLUSTER_K = 2


# ══════════════════════════════════════════════════════════════════════════════
# Risk model helpers
# ══════════════════════════════════════════════════════════════════════════════

def load_risk_dataset() -> pd.DataFrame:
    if RISK_DATASET_PATH.exists():
        return pd.read_csv(RISK_DATASET_PATH)

    np.random.seed(42)
    n = 60
    baixo = pd.DataFrame({
        "media_score_risco":   np.random.normal(2.226, 0.481, n),
        "media_defeitos":      np.random.normal(0.740, 0.425, n),
        "percentual_os_altas": np.random.normal(0.0,   0.01,  n).clip(0, 1),
        "total_os_log":        np.random.normal(1.204, 0.549, n),
        "risco_produto": 0,
    })
    medio = pd.DataFrame({
        "media_score_risco":   np.random.normal(2.648, 0.237, n),
        "media_defeitos":      np.random.normal(0.878, 0.335, n),
        "percentual_os_altas": np.random.normal(0.090, 0.082, n).clip(0, 1),
        "total_os_log":        np.random.normal(3.349, 1.293, n),
        "risco_produto": 1,
    })
    alto = pd.DataFrame({
        "media_score_risco":   np.random.normal(3.128, 0.486, n),
        "media_defeitos":      np.random.normal(0.948, 0.446, n),
        "percentual_os_altas": np.random.normal(0.359, 0.282, n).clip(0, 1),
        "total_os_log":        np.random.normal(4.345, 2.557, n),
        "risco_produto": 2,
    })
    df = pd.concat([baixo, medio, alto], ignore_index=True)
    for col in RISK_FEATURES:
        df[col] = df[col].clip(lower=0)
    return df.sample(frac=1, random_state=42).reset_index(drop=True)


def run_training(df: pd.DataFrame) -> dict:
    X = df[RISK_FEATURES]
    y = df["risco_produto"]
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    candidates = {
        "random-forest": RandomForestClassifier(
            n_estimators=200, max_depth=10, random_state=42, class_weight="balanced"
        ),
        "xgboost": XGBClassifier(
            n_estimators=200, max_depth=6, learning_rate=0.05,
            random_state=42, objective="multi:softmax", num_class=3, verbosity=0,
        ),
        "logistic-regression": LogisticRegression(max_iter=2000, class_weight="balanced"),
    }
    results = {}
    for name, model in candidates.items():
        model.fit(X_train, y_train)
        pred = model.predict(X_test)
        report = classification_report(y_test, pred, output_dict=True)
        results[name] = {
            "model":     model,
            "accuracy":  float(accuracy_score(y_test, pred)),
            "precision": float(report["weighted avg"]["precision"]),
            "recall":    float(report["weighted avg"]["recall"]),
        }
    best_name = "logistic-regression"
    best = results[best_name]
    RISK_MODEL_PATH.parent.mkdir(exist_ok=True)
    joblib.dump({"model": best["model"], "features": RISK_FEATURES, "model_name": best_name}, RISK_MODEL_PATH)
    return {
        "best_model": best_name,
        "accuracy":   best["accuracy"],
        "precision":  best["precision"],
        "recall":     best["recall"],
        "rows_total": len(df),
        "all_models": {k: {"accuracy": v["accuracy"]} for k, v in results.items()},
    }


def run_risk_inference(df: pd.DataFrame) -> dict:
    if not RISK_MODEL_PATH.exists():
        raise HTTPException(400, "Model not trained yet. Run type=training first.")
    saved = joblib.load(RISK_MODEL_PATH)
    preds = saved["model"].predict(df[RISK_FEATURES])
    label_map = {0: "Baixo", 1: "Médio", 2: "Alto"}
    return {
        "model_name":     saved["model_name"],
        "rows_processed": len(df),
        "predictions":    {label_map[k]: int((preds == k).sum()) for k in range(3)},
    }


# ══════════════════════════════════════════════════════════════════════════════
# Clustering helpers
# ══════════════════════════════════════════════════════════════════════════════

def preprocess_os(df: pd.DataFrame) -> tuple[pd.DataFrame, RobustScaler]:
    df = df.copy()
    df["em_garantia"] = df["em_garantia"].fillna(0).astype(int)
    df["tempo_aberto_log"] = np.log1p(df["tempo_aberto_dias"])

    missing = set(CLUSTER_FEATURES) - set(df.columns)
    if missing:
        raise HTTPException(400, f"CSV está faltando colunas: {missing}")

    scaler = RobustScaler()
    X_scaled = scaler.fit_transform(df[CLUSTER_FEATURES])
    return df, X_scaled, scaler


def run_clustering(df: pd.DataFrame) -> dict:
    df, X_scaled, scaler = preprocess_os(df)

    km = KMeans(n_clusters=CLUSTER_K, random_state=42, n_init=10)
    df["cluster"] = km.fit_predict(X_scaled)

    # Metrics on sample (silhouette is O(n²))
    sample_size = min(10_000, len(df))
    idx = np.random.RandomState(42).choice(len(X_scaled), size=sample_size, replace=False)
    labels_sample = km.predict(X_scaled[idx])
    sil = float(silhouette_score(X_scaled[idx], labels_sample))
    db  = float(davies_bouldin_score(X_scaled[idx], labels_sample))
    ch  = float(calinski_harabasz_score(X_scaled[idx], labels_sample))

    # Cluster profile
    profile = (
        df.groupby("cluster")[CLUSTER_FEATURES]
        .mean()
        .round(3)
        .to_dict(orient="index")
    )
    dist = df["cluster"].value_counts().sort_index()
    cluster_sizes = {
        str(k): {"count": int(v), "pct": round(v / len(df) * 100, 2)}
        for k, v in dist.items()
    }

    # Save model + scaler
    CLUSTER_MODEL_PATH.parent.mkdir(exist_ok=True)
    joblib.dump(
        {"model": km, "scaler": scaler, "features": CLUSTER_FEATURES, "k": CLUSTER_K},
        CLUSTER_MODEL_PATH,
    )

    return {
        "rows_processed": len(df),
        "metrics": {"silhouette": sil, "davies_bouldin": db, "calinski_harabasz": ch},
        "cluster_sizes": cluster_sizes,
        "cluster_profile": {str(k): v for k, v in profile.items()},
    }


# ══════════════════════════════════════════════════════════════════════════════
# Pydantic schemas
# ══════════════════════════════════════════════════════════════════════════════

class RunRequest(BaseModel):
    run_type: Literal["risk_inference", "clustering", "training"] = "training"


class PredictRequest(BaseModel):
    data: list[dict]


# ══════════════════════════════════════════════════════════════════════════════
# Endpoints
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "risk_model_ready":    RISK_MODEL_PATH.exists(),
        "cluster_model_ready": CLUSTER_MODEL_PATH.exists(),
    }


@app.post("/run")
async def trigger_run(req: RunRequest):
    t0 = time.time()

    if req.run_type == "training":
        df = load_risk_dataset()
        r  = run_training(df)
        elapsed  = round(time.time() - t0, 2)
        size_kb  = int(RISK_MODEL_PATH.stat().st_size / 1024)
        return {
            "status":          "success",
            "rows_processed":  r["rows_total"],
            "model_version":   f"{r['best_model']}-v1",
            "metadata": {
                "best_model": r["best_model"],
                "metrics":    {"accuracy": r["accuracy"], "precision": r["precision"], "recall": r["recall"]},
                "all_models": r["all_models"],
                "training_time_s": elapsed,
                "artifacts": [{"name": "risk_model.joblib", "size_kb": size_kb}],
            },
        }

    if req.run_type == "risk_inference":
        df = load_risk_dataset()
        r  = run_risk_inference(df)
        elapsed = round(time.time() - t0, 2)
        return {
            "status":         "success",
            "rows_processed": r["rows_processed"],
            "model_version":  f"{r['model_name']}-v1",
            "metadata": {
                "model_name":        r["model_name"],
                "predictions":       r["predictions"],
                "inference_time_s":  elapsed,
            },
        }

    if req.run_type == "clustering":
        if not OS_DATASET_PATH.exists():
            raise HTTPException(
                400,
                f"dataset_os.csv não encontrado em ml/datasets/. "
                "Coloque o arquivo lá ou use POST /upload-clustering para subir via HTTP."
            )
        df = pd.read_csv(OS_DATASET_PATH)
        r  = run_clustering(df)
        elapsed = round(time.time() - t0, 2)
        size_kb = int(CLUSTER_MODEL_PATH.stat().st_size / 1024)
        return {
            "status":         "success",
            "rows_processed": r["rows_processed"],
            "model_version":  f"kmeans-k{CLUSTER_K}-v1",
            "metadata": {
                "model_name":       f"KMeans k={CLUSTER_K}",
                "metrics":          r["metrics"],
                "cluster_sizes":    r["cluster_sizes"],
                "cluster_profile":  r["cluster_profile"],
                "training_time_s":  elapsed,
                "artifacts": [{"name": "clustering_model.joblib", "size_kb": size_kb}],
            },
        }


@app.post("/upload-clustering")
async def upload_and_cluster(file: UploadFile = File(...)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(400, "Envie um arquivo .csv")

    t0      = time.time()
    content = await file.read()
    df      = pd.read_csv(io.BytesIO(content))

    r       = run_clustering(df)
    elapsed = round(time.time() - t0, 2)
    size_kb = int(CLUSTER_MODEL_PATH.stat().st_size / 1024)

    return {
        "status":         "success",
        "rows_processed": r["rows_processed"],
        "model_version":  f"kmeans-k{CLUSTER_K}-v1",
        "metadata": {
            "model_name":      f"KMeans k={CLUSTER_K}",
            "metrics":         r["metrics"],
            "cluster_sizes":   r["cluster_sizes"],
            "cluster_profile": r["cluster_profile"],
            "training_time_s": elapsed,
            "artifacts": [{"name": "clustering_model.joblib", "size_kb": size_kb}],
        },
    }


@app.post("/predict")
async def predict(req: PredictRequest):
    if not RISK_MODEL_PATH.exists():
        raise HTTPException(400, "Model not trained. Run /run with type=training first.")
    saved   = joblib.load(RISK_MODEL_PATH)
    df      = pd.DataFrame(req.data)
    missing = set(RISK_FEATURES) - set(df.columns)
    if missing:
        raise HTTPException(400, f"Missing features: {missing}")
    preds     = saved["model"].predict(df[RISK_FEATURES])
    label_map = {0: "Baixo", 1: "Médio", 2: "Alto"}
    return {"predictions": [label_map[int(p)] for p in preds]}
