#!/bin/bash
set -e

# Install a Node.js 20 build that works on older Amazon Linux GLIBC.
if ! command -v node &>/dev/null || [[ "$(node -v)" != v20* ]]; then
  NODE_VERSION=20.20.2
  NODE_DIR=/usr/local/node-v$NODE_VERSION
  curl -fsSL "https://unofficial-builds.nodejs.org/download/release/v$NODE_VERSION/node-v$NODE_VERSION-linux-x64-glibc-217.tar.xz" -o /tmp/node.tar.xz
  rm -rf "$NODE_DIR"
  mkdir -p "$NODE_DIR"
  tar -xJf /tmp/node.tar.xz -C "$NODE_DIR" --strip-components=1
  ln -sf "$NODE_DIR/bin/node" /usr/bin/node
  ln -sf "$NODE_DIR/bin/npm" /usr/bin/npm
  ln -sf "$NODE_DIR/bin/npx" /usr/bin/npx
fi

# Install nginx if not present
if ! command -v nginx &>/dev/null; then
  amazon-linux-extras enable nginx1 || true
  yum install -y nginx
fi

# Ensure app directory exists
mkdir -p /home/ec2-user/lawtalk/backend
chown -R ec2-user:ec2-user /home/ec2-user/lawtalk
