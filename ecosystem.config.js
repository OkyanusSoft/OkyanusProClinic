module.exports = {
  apps: [
    {
      name: 'dental-web',
      script: 'node_modules/next/dist/bin/next', // المسار المباشر لملف تشغيل Next.js
      args: 'start -p 8080',
      cwd: './',
      watch: false,
    },
  ],
};