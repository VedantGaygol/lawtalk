#!/bin/bash

# Gracefully stop backend; don't fail if it's not running yet (first deploy)
systemctl stop lawtalk-backend || true