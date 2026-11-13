const buf = Buffer.alloc(64);
buf.writeInt32LE(987654321, 0);
buf.writeInt32LE(87, 8);
buf.writeFloatLE(1350.5, 16);
buf.writeInt32LE(420000, 24);

setInterval(() => {
  if (process.send) process.send('tick');
}, 1000);

process.on('SIGTERM', () => process.exit(0));