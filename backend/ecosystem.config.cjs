module.exports = {
  apps: [
    {
      name: "ejc-connect-backend",
      cwd: process.env.EJC_BACKEND_CWD || process.cwd(),
      script: "src/server.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "development",
        PORT: Number(process.env.PORT || 3000)
      },
      env_production: {
        NODE_ENV: "production",
        PORT: Number(process.env.PORT || 3000)
      }
    }
  ]
};
