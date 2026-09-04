module.exports = {
  apps: [
    {
      name: "mon-name-converter",
      cwd: "/var/www/mon-name-converter/yamu/.next/standalone",
      script: "server.js",
      node_args: "--dns-result-order=ipv4first --env-file=/var/www/mon-name-converter/yamu/.env.local",
      env: {
        NODE_ENV: "production",
        // Next.js normalizes 127.0.0.1 to localhost inside middleware. Using
        // the same hostname here prevents internal rewrites becoming HTTPS
        // self-proxy requests, while ipv4first keeps the listener on loopback.
        HOSTNAME: "localhost",
        PORT: 3002,
      },
    },
  ],
};
