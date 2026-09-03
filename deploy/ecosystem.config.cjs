module.exports = {
  apps: [
    {
      name: "mon-name-converter",
      cwd: "/var/www/mon-name-converter/yamu/.next/standalone",
      script: "server.js",
      node_args: "--env-file=/var/www/mon-name-converter/yamu/.env.local",
      env: {
        NODE_ENV: "production",
        HOSTNAME: "127.0.0.1",
        PORT: 3002,
      },
    },
  ],
};
