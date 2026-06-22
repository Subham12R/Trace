#!/bin/bash
# Temporarily rename root package files to prevent npm from using workspace hoisting
if [ -f ../../package.json ]; then
  mv ../../package.json ../../package.json.bak
fi
if [ -f ../../package-lock.json ]; then
  mv ../../package-lock.json ../../package-lock.json.bak
fi

# Run clean local installation and build
npm install
npm run build

# Restore root package files
if [ -f ../../package.json.bak ]; then
  mv ../../package.json.bak ../../package.json
fi
if [ -f ../../package-lock.json.bak ]; then
  mv ../../package-lock.json.bak ../../package-lock.json
fi
