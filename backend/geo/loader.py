from functools import lru_cache
import geopandas as gpd
import json
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
    # Wir laden den GDF nur für Metadaten und Filterung
    gdf = gpd.read_file(PLZ_GEOJSON_PATH)
    for col in ["postcode", "plz2"]:
        if col in gdf.columns:
            gdf[col] = gdf[col].astype(str).str.zfill(5 if col == "postcode" else 2)
    if "bundesland" in gdf.columns:
        gdf["bundesland"] = gdf["bundesland"].fillna("").astype(str).str.strip()
    return gdf

# NEU: Wir cachen das fertige JSON als String, um to_json() zu vermeiden
@lru_cache(maxsize=1)
def get_full_geojson_as_string():
    gdf = load_geojson_gdf()
    return gdf.to_json()

def get_available_bundeslaender():
    if not geojson_exists(): return []
    gdf = load_geojson_gdf()
    if "bundesland" not in gdf.columns: return []
    return sorted([v for v in gdf["bundesland"].unique().tolist() if v])

def get_geojson_features(limit=None, bundesland=None):
    if not geojson_exists(): return None

    # Performance-Turbo: Wenn kein Filter gesetzt ist, schicke den fertigen Cache-String
    if limit is None and bundesland is None:
        return get_full_geojson_as_string()

    # Nur wenn gefiltert werden muss, nutzen wir die langsame to_json() Methode
    # Aber durch das Filtern ist die Datenmenge klein genug für den RAM
    gdf = load_geojson_gdf()
    if bundesland:
        gdf = gdf[gdf["bundesland"] == str(bundesland).strip()]
    if limit:
        gdf = gdf.head(limit)
        
    return gdf.to_json()

# Die anderen Funktionen (get_postcode_records etc.) können so bleiben wie sie sind
def get_geojson_metadata():
    if not geojson_exists(): return {"exists": False, "row_count": 0, "columns": []}
    gdf = load_geojson_gdf()
    return {"exists": True, "row_count": len(gdf), "columns": list(gdf.columns)}

def get_postcode_records(limit=None, bundesland=None):
    if not geojson_exists(): return []
    gdf = load_geojson_gdf()
    if bundesland:
        gdf = gdf[gdf["bundesland"] == str(bundesland).strip()]
    keep_cols = [col for col in ["postcode", "plz2", "bundesland"] if col in gdf.columns]
    df = gdf[keep_cols].fillna("")
    if limit: df = df.head(limit)
    return df.to_dict(orient="records")