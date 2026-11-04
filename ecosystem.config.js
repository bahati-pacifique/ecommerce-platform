module.exports = {
  apps: [{
    name: "cococe",
    script: "./server.js",
    instances: "max", 
    exec_mode: "cluster",
    autorestart: true,
    watch: false,
    max_memory_restart: "2G",
    exp_backoff_restart_delay: 100,
    env: {
      NODE_ENV: "development",
    },
    env_production: {
      NODE_ENV: "production",
    }
  }]
};