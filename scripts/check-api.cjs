const { ComfyUIApiClient } = require('@stable-canvas/comfyui-client');

const client = new ComfyUIApiClient({
  api_host: '127.0.0.1',
  api_port: 8188,
});

console.log('Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(client)).filter(name => name !== 'constructor'));
console.log('Client instance properties:', Object.keys(client));