#!/bin/bash
set -e

# Install Node.js 20 if not present
if ! command -v node &>/dev/null || [[ "$(node -v)" != v20* ]]; then
  curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
  yum install -y nodejs
fi

# Install nginx if not present
if ! command -v nginx &>/dev/null; then
  amazon-linux-extras enable nginx1 || true
  yum install -y nginx
fi

# Ensure app directory exists
mkdir -p /home/ec2-user/lawtalk/backend
chown -R ec2-user:ec2-user /home/ec2-user/lawtalk