import json
from typing import Optional

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from geo.loader import (
    load_markers,
    geojson_exists,
    get_geojson_metadata,
    get_geojson_preview,
    get_data_mode,
    get_geojson_sample,
    get_postcode_records,
    get_geojson_features,
    get_available_bundeslaender,
)

router = APIRouter(prefix="/markers", tags=["markers"])


@router.get("/")
def get_markers():
    return load_markers()


@router.get("/status")
def get_markers_status():
    return {
        "geojson_exists": geojson_exists(),
        "mode": get_data_mode(),
    }


@router.get("/geo-metadata")
def get_geo_metadata():
    return get_geojson_metadata()


@router.get("/bundeslaender")
def get_bundeslaender():
    return get_available_bundeslaender()


@router.get("/geo-preview")
def get_geo_preview(
    bundesland: Optional[str] = Query(default=None)
):
    return get_geojson_preview(bundesland=bundesland)


@router.get("/geo-sample")
def get_geo_sample(
    bundesland: Optional[str] = Query(default=None)
):
    sample = get_geojson_sample(bundesland=bundesland)

    if sample is None:
        return JSONResponse(status_code=404, content={"error": "GeoJSON nicht gefunden"})

    return JSONResponse(content=json.loads(sample))


@router.get("/postcode-records")
def get_postcode_records_route(
    bundesland: Optional[str] = Query(default=None)
):
    return get_postcode_records(bundesland=bundesland)


@router.get("/geo-features")
def get_geo_features(
    limit: int = Query(default=1000, ge=1, le=3000),
    bundesland: Optional[str] = Query(default=None),
):
    features = get_geojson_features(limit=limit, bundesland=bundesland)

    if features is None:
        return JSONResponse(status_code=404, content={"error": "GeoJSON nicht gefunden"})

    return JSONResponse(content=json.loads(features))