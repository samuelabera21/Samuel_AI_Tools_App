#!/bin/bash
# This script runs before dependency detection
# Remove Python requirements to prevent auto-detection
rm -f requirements.txt requirements-music.txt
echo "Python dependencies ignored for frontend deployment"
