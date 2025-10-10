module.exports = {
  apps: [
    {
      name: 'collabboard-1',
      script: './server/index.js',
      instances: 1,
      env: {
        PORT: 3000,
        INSTANCE_ID: 'instance-1',
        REDIS_URL: 'redis://localhost:6379'
      }
    },
    {
      name: 'collabboard-2',
      script: './server/index.js',
      instances: 1,
      env: {
        PORT: 3001,
        INSTANCE_ID: 'instance-2',
        REDIS_URL: 'redis://localhost:6379'
      }
    }
  ]
};