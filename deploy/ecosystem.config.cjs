module.exports = {
  apps: [
    {
      name: "mon-name-converter",
      cwd: "/var/www/mon-name-converter/yamu/.next/standalone",
      script: "server.js",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
        DATA_DIR: "/var/lib/mon-names",
      },
    },
  ],
};
