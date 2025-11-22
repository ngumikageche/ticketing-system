#!/usr/bin/env bash
# Run tests inside the project's venv. Usage:
#   ./backend/scripts/run_tests.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV_DIR="$ROOT_DIR/venv"

if [[ ! -d "$VENV_DIR" ]]; then
    echo "No virtualenv found at $VENV_DIR. Create one with: python3 -m venv $VENV_DIR" >&2
    exit 1
fi

# Activate venv
source "$VENV_DIR/bin/activate"

echo "Running tests using Python: $(which python)" >&2

cd "$ROOT_DIR"
pytest -q "$@"
