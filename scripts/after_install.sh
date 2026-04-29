#!/bin/bash
set -e

APP_DIR=/home/ec2-user/lawtalk/backend

# Install production dependencies only
cd $APP_DIR
npm ci --omit=dev

# Install drizzle-kit for migrations
npm install drizzle-kit --save-dev

# Run database migrations
npm run db:push

# Write nginx config to proxy /api and /socket.io to backend, serve frontend from root
cat > /etc/nginx/conf.d/lawtalk.conf <<'EOF'
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # Proxy API requests to Express backend
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Proxy Socket.io WebSocket connections
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # SPA fallback — serve index.html for all unmatched routes
    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

# Write systemd service for the backend
cat > /etc/systemd/system/lawtalk-backend.service <<EOF
[Unit]
Description=LawTalk Backend API
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/lawtalk/backend
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=5
EnvironmentFile=-/home/ec2-user/lawtalk/.env

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable lawtalk-backend
systemctl enable nginx
