from functools import lru_cache

import geopandas as gpd

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
    gdf = gpd.read_file(PLZ_GEOJSON_PATH)

    if "postcode" in gdf.columns:
        gdf["postcode"] = gdf["postcode"].astype(str).str.zfill(5)

    if "plz2" in gdf.columns:
        gdf["plz2"] = gdf["plz2"].astype(str).str.zfill(2)

    if "bundesland" in gdf.columns:
        gdf["bundesland"] = (
            gdf["bundesland"]
            .fillna("")
            .astype(str)
            .str.strip()
        )

    if "postcode" in gdf.columns:
        gdf = gdf.sort_values("postcode").reset_index(drop=True)

    return gdf


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
    if "bundesland" not in gdf.columns:
        return []

    values = [value for value in gdf["bundesland"].unique().tolist() if value]
    return sorted(values)


def filter_gdf_by_bundesland(gdf, bundesland=None):
    if not bundesland:
        return gdf

    if "bundesland" not in gdf.columns:
        return gdf.iloc[0:0].copy()

    bundesland = str(bundesland).strip()
    return gdf[gdf["bundesland"] == bundesland].copy()


def get_geojson_preview(limit=10, bundesland=None):
    if not geojson_exists():
        return []

    gdf = filter_gdf_by_bundesland(load_geojson_gdf(), bundesland)
    keep_cols = [col for col in ["postcode", "plz2", "bundesland"] if col in gdf.columns]
    return gdf[keep_cols].head(limit).fillna("").to_dict(orient="records")


def get_geojson_sample(limit=20, bundesland=None):
    if not geojson_exists():
        return None

    gdf = filter_gdf_by_bundesland(load_geojson_gdf(), bundesland)
    return gdf.head(limit).to_json()


def get_postcode_records(limit=None, bundesland=None):
    if not geojson_exists():
        return []

    gdf = filter_gdf_by_bundesland(load_geojson_gdf(), bundesland)
    keep_cols = [col for col in ["postcode", "plz2", "bundesland"] if col in gdf.columns]
    records_df = gdf[keep_cols].fillna("")

    if limit is not None:
        records_df = records_df.head(limit)

    return records_df.to_dict(orient="records")


def get_geojson_features(limit=None, bundesland=None):
    if not geojson_exists():
        return None

    gdf = filter_gdf_by_bundesland(load_geojson_gdf(), bundesland)
    return gdf.head(limit).to_json()