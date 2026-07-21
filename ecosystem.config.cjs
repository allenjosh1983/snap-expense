/** @type {import('pm2').StartOptions} */
module.exports = {
  apps: [
    {
      name: "snap-expense",
      cwd: __dirname,
      script: "npm",
      args: "start",
      interpreter: "none",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
    },
  ],
};
