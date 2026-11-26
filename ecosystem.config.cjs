module.exports = {
  apps: [
    {
      name: "gerador-codigo-barras",
      cwd: "/repositorios/gerador-codigo-barras",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3010",
      env: { NODE_ENV: "production" },
      max_memory_restart: "400M",
      max_restarts: 10,
      restart_delay: 5000,
    },
  ],
};