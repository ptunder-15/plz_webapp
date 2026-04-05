from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"

PLZ_GEOJSON_PATH = DATA_DIR / "plz_geo_with_state.geojson"