from functools import lru_cache
import geopandas as gpd
import json
import os
from geo.sources import PLZ_GEOJSON_PATH
from markers_data import demo_markers

def geojson_exists():
    return PLZ_GEOJSON_PATH.exists()

def get_data_mode():
    return "geojson" if geojson_exists() else "demo_markers"

def load_markers():
    return demo_markers

@lru_cache(maxsize=1)
def load_geojson_gdf():
    if not geojson_exists():
        return None
    gdf = gpd.read_file(PLZ_GEOJSON_PATH)
    for col in ["postcode", "plz2"]:
        if col in gdf.columns:
            gdf[col] = gdf[col].astype(str).str.zfill(5 if col == "postcode" else 2)
    if "bundesland" in gdf.columns:
        gdf["bundesland"] = gdf["bundesland"].fillna("").astype(str).str.strip()
    return gdf

@lru_cache(maxsize=1)
def get_full_geojson_as_string():
    gdf = load_geojson_gdf()
    return gdf.to_json() if gdf is not None else None

def get_geojson_metadata():
    if not geojson_exists():
        return {"exists": False, "row_count": 0, "columns": []}
    gdf = load_geojson_gdf()
    return {
        "exists": True,
        "row_count": len(gdf),
        "columns": list(gdf.columns),
    }

def get_available_bundeslaender():
    if not geojson_exists():
        return []
    gdf = load_geojson_gdf()
    if gdf is None or "bundesland" not in gdf.columns:
        return []
    values = [value for value in gdf["bundesland"].unique().tolist() if value]
    return sorted(values)

def get_geojson_features(limit=None, bundesland=None):
    if not geojson_exists():
        return None
    
    # Turbo-Cache wenn kein Filter aktiv ist
    if limit is None and bundesland is None:
        return get_full_geojson_as_string()

    gdf = load_geojson_gdf()
    if bundesland:
        gdf = gdf[gdf["bundesland"] == str(bundesland).strip()]
    if limit:
        gdf = gdf.head(limit)
    return gdf.to_json()

def get_postcode_records(limit=None, bundesland=None):
    if not geojson_exists():
        return []
    gdf = load_geojson_gdf()
    if bundesland:
        gdf = gdf[gdf["bundesland"] == str(bundesland).strip()]
    keep_cols = [col for col in ["postcode", "plz2", "bundesland"] if col in gdf.columns]
    records_df = gdf[keep_cols].fillna("")
    if limit is not None:
        records_df = records_df.head(limit)
    return records_df.to_dict(orient="records")

# Diese beiden haben gefehlt und den Absturz verursacht:
def get_geojson_preview(limit=10, bundesland=None):
    if not geojson_exists():
        return []
    gdf = load_geojson_gdf()
    if bundesland:
        gdf = gdf[gdf["bundesland"] == str(bundesland).strip()]
    keep_cols = [col for col in ["postcode", "plz2", "bundesland"] if col in gdf.columns]
    return gdf[keep_cols].head(limit).fillna("").to_dict(orient="records")

def get_geojson_sample(limit=20, bundesland=None):
    if not geojson_exists():
        return None
    gdf = load_geojson_gdf()
    if bundesland:
        gdf = gdf[gdf["bundesland"] == str(bundesland).strip()]
    return gdf.head(limit).to_json()