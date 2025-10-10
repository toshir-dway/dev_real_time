// start-instances.js
const { spawn } = require('child_process');

const instances = [
  {
    name: 'Instance 1',
    port: 3000,
    instanceId: 'instance-1'
  },
  {
    name: 'Instance 2', 
    port: 3001,
    instanceId: 'instance-2'
  }
];

console.log('🚀 Démarrage des instances CollabBoard avec Redis...');
console.log('🔗 Redis URL: redis://localhost:6379');

instances.forEach(instance => {
  const env = {
    ...process.env,
    PORT: instance.port,
    INSTANCE_ID: instance.instanceId,
    REDIS_URL: 'redis://localhost:6379'
  };

  const child = spawn('node', ['server/index.js'], { env });
  
  child.stdout.on('data', (data) => {
    console.log(`[${instance.name}] ${data}`);
  });
  
  child.stderr.on('data', (data) => {
    console.error(`[${instance.name}-ERROR] ${data}`);
  });
  
  child.on('close', (code) => {
    console.log(`[${instance.name}] Processus terminé avec le code ${code}`);
  });
});