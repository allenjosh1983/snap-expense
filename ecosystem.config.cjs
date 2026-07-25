/** @type {import('pm2').StartOptions} */
module.exports = {
  apps: [
    {
      name: "snap-expense",
      cwd: __dirname,
      script: ".next/standalone/server.js",
      interpreter: "node",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: "3000",
        HOSTNAME: "0.0.0.0",
      },
    },
  ],
};
