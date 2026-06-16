import time
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier

app = FastAPI(title="Datasentinel ML API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"],
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).parent.parent
DATASET_PATH = BASE_DIR / "datasets" / "dataset_produto_demo.csv"
MODEL_PATH = BASE_DIR / "risk_model" / "risk_model.joblib"

FEATURES = ["media_score_risco", "media_defeitos", "percentual_os_altas", "total_os_log"]


def load_dataset() -> pd.DataFrame:
    if DATASET_PATH.exists():
        return pd.read_csv(DATASET_PATH)

    # Fallback: synthetic data com a distribuição do notebook
    np.random.seed(42)
    n = 60
    baixo = pd.DataFrame({
        "media_score_risco": np.random.normal(2.226, 0.481, n),
        "media_defeitos": np.random.normal(0.740, 0.425, n),
        "percentual_os_altas": np.random.normal(0.0, 0.01, n).clip(0, 1),
        "total_os_log": np.random.normal(1.204, 0.549, n),
        "risco_produto": 0,
    })
    medio = pd.DataFrame({
        "media_score_risco": np.random.normal(2.648, 0.237, n),
        "media_defeitos": np.random.normal(0.878, 0.335, n),
        "percentual_os_altas": np.random.normal(0.090, 0.082, n).clip(0, 1),
        "total_os_log": np.random.normal(3.349, 1.293, n),
        "risco_produto": 1,
    })
    alto = pd.DataFrame({
        "media_score_risco": np.random.normal(3.128, 0.486, n),
        "media_defeitos": np.random.normal(0.948, 0.446, n),
        "percentual_os_altas": np.random.normal(0.359, 0.282, n).clip(0, 1),
        "total_os_log": np.random.normal(4.345, 2.557, n),
        "risco_produto": 2,
    })
    df = pd.concat([baixo, medio, alto], ignore_index=True)
    for col in FEATURES:
        df[col] = df[col].clip(lower=0)
    return df.sample(frac=1, random_state=42).reset_index(drop=True)


def run_training(df: pd.DataFrame) -> dict:
    X = df[FEATURES]
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
            "model": model,
            "accuracy": float(accuracy_score(y_test, pred)),
            "precision": float(report["weighted avg"]["precision"]),
            "recall": float(report["weighted avg"]["recall"]),
        }

    best_name = "logistic-regression"
    best = results[best_name]

    MODEL_PATH.parent.mkdir(exist_ok=True)
    joblib.dump({"model": best["model"], "features": FEATURES, "model_name": best_name}, MODEL_PATH)


    return {
        "best_model": best_name,
        "accuracy": best["accuracy"],
        "precision": best["precision"],
        "recall": best["recall"],
        "rows_total": len(df),
        "all_models": {k: {"accuracy": v["accuracy"]} for k, v in results.items()},
    }


def run_inference(df: pd.DataFrame) -> dict:
    if not MODEL_PATH.exists():
        raise HTTPException(400, "Model not trained yet. Run type=training first.")
    saved = joblib.load(MODEL_PATH)
    preds = saved["model"].predict(df[FEATURES])
    label_map = {0: "Baixo", 1: "Médio", 2: "Alto"}
    return {
        "model_name": saved["model_name"],
        "rows_processed": len(df),
        "predictions": {label_map[k]: int((preds == k).sum()) for k in range(3)},
    }


class RunRequest(BaseModel):
    run_type: Literal["risk_inference", "clustering", "training"] = "training"


class PredictRequest(BaseModel):
    data: list[dict]


@app.get("/health")
async def health():
    return {"status": "ok", "model_ready": MODEL_PATH.exists()}


@app.post("/run")
async def trigger_run(req: RunRequest):
    if req.run_type == "clustering":
        return {
            "status": "skipped",
            "rows_processed": 0,
            "model_version": "N/A",
            "metadata": {"message": "Clustering não implementado ainda."},
        }

    df = load_dataset()
    t0 = time.time()

    if req.run_type == "training":
        r = run_training(df)
        elapsed = round(time.time() - t0, 2)
        size_kb = int(MODEL_PATH.stat().st_size / 1024)
        return {
            "status": "success",
            "rows_processed": r["rows_total"],
            "model_version": f"{r['best_model']}-v1",
            "metadata": {
                "best_model": r["best_model"],
                "metrics": {
                    "accuracy": r["accuracy"],
                    "precision": r["precision"],
                    "recall": r["recall"],
                },
                "all_models": r["all_models"],
                "training_time_s": elapsed,
                "artifacts": [{"name": "risk_model.joblib", "size_kb": size_kb}],
            },
        }

    if req.run_type == "risk_inference":
        r = run_inference(df)
        elapsed = round(time.time() - t0, 2)
        return {
            "status": "success",
            "rows_processed": r["rows_processed"],
            "model_version": f"{r['model_name']}-v1",
            "metadata": {
                "model_name": r["model_name"],
                "predictions": r["predictions"],
                "inference_time_s": elapsed,
            },
        }


@app.post("/predict")
async def predict(req: PredictRequest):
    if not MODEL_PATH.exists():
        raise HTTPException(400, "Model not trained. Run /run with type=training first.")
    saved = joblib.load(MODEL_PATH)
    df = pd.DataFrame(req.data)
    missing = set(FEATURES) - set(df.columns)
    if missing:
        raise HTTPException(400, f"Missing features: {missing}")
    preds = saved["model"].predict(df[FEATURES])
    label_map = {0: "Baixo", 1: "Médio", 2: "Alto"}
    return {"predictions": [label_map[int(p)] for p in preds]}
