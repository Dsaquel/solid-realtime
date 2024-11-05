#!/bin/bash

# install.sh
# Make script exit on first error
set -e

# Default paths (can be overridden by environment variables)
PROJECT_PATH="${PROJECT_PATH:-"."}"
LIBRARY_ROUTES="${PROJECT_PATH}/node_modules/solid-realtime/src/routes"
PROJECT_ROUTES="${PROJECT_PATH}/src/routes"

# Ensure the target directory exists
mkdir -p "${PROJECT_ROUTES}/api"

# Copy all API routes from the library to the project
echo "Copying API routes from ${LIBRARY_ROUTES} to ${PROJECT_ROUTES}/api"
cp -Lr "${LIBRARY_ROUTES}/api/"* "${PROJECT_ROUTES}/api/"

echo "Routes successfully copied!"