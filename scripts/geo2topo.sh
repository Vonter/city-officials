#!/bin/bash
set -euo pipefail

CITY="${1:?Usage: $0 <city> (e.g. blr, mumbai, delhi)}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CITY_DIR="${SCRIPT_DIR}/${CITY}"
OUTDIR="${SCRIPT_DIR}/../static/${CITY}"

if [ ! -d "${CITY_DIR}/geojson" ]; then
  echo "Error: ${CITY_DIR}/geojson/ not found" >&2
  exit 1
fi

mkdir -p "$OUTDIR"

# --- Per-city configuration ---
SNAP=0.00005
SIMPLIFY="visvalingam weighted 35% keep-shapes"

case "$CITY" in
  blr)     BBOX="77.22 12.67 77.84 13.33" ;;
  chennai) BBOX="79.9 12.65 80.45 13.4" ;;
  delhi)   BBOX="" ;;
  hyd)     BBOX="77.9 16.9 79.15 18.0" ;;
  kolkata) BBOX="" ;;
  mumbai)  BBOX="72.3 18.6 73.5 19.6" ;;
  pune)    BBOX="73.3 17.85 75.2 19.4" ;;
  vizag)   BBOX="82.99440736 17.54647477 83.46370155 17.94043904" ;;
  *)       echo "Error: unknown city '${CITY}'" >&2; exit 1 ;;
esac

sed_inplace() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "$@"
  else
    sed -i "$@"
  fi
}

WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT

# --- Clip (if BBOX set) and simplify per-department files ---
for f in "${CITY_DIR}"/geojson/*.geojson; do
  base=$(basename "$f" .geojson)
  input="$f"

  if [ -n "$BBOX" ]; then
    ogr2ogr -makevalid -spat $BBOX "${WORK_DIR}/${base}_clipped.geojson" "$f"
    input="${WORK_DIR}/${base}_clipped.geojson"
  fi

  mapshaper "$input" -snap interval=$SNAP -simplify $SIMPLIFY -o "${WORK_DIR}/${base}_simplified.geojson"
  geo2topo -q 1e5 --out "${OUTDIR}/boundaries_${base}.json" "${WORK_DIR}/${base}_simplified.geojson"
  sed_inplace "s/\"${base}_simplified\"/\"boundaries\"/" "${OUTDIR}/boundaries_${base}.json"
done

# --- Monolithic file (topology-aware across all layers) ---
CLIPPED_FILES=()
for f in "${CITY_DIR}"/geojson/*.geojson; do
  base=$(basename "$f" .geojson)
  if [ -n "$BBOX" ]; then
    CLIPPED_FILES+=("${WORK_DIR}/${base}_clipped.geojson")
  else
    CLIPPED_FILES+=("$f")
  fi
done

mapshaper "${CLIPPED_FILES[@]}" combine-files \
  -snap interval=$SNAP \
  -simplify $SIMPLIFY \
  -merge-layers force \
  -o format=topojson quantization=1e5 "${OUTDIR}/boundaries.json"
sed_inplace 's/"layer"/"boundaries"/' "${OUTDIR}/boundaries.json"

echo "Done: ${OUTDIR}/"
