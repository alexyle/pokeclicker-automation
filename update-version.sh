#!/bin/bash
# Script to update VERSION file with current git hash
git rev-parse --short HEAD > VERSION
echo "Version updated to: $(cat VERSION)"
