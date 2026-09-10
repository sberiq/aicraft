#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "== Node typecheck =="
npm run typecheck

echo "== Node tests =="
npm test

echo "== Node production build =="
npm run build

echo "== Fabric mod build =="
(cd client-mod && ./gradlew --no-daemon build)

echo "== Paper plugin build =="
(cd server-plugin && mvn -q clean package)

echo "== Dependency audit =="
npm audit

echo "All verification checks passed."
