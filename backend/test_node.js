const http = require('http');

const data = JSON.stringify({ status: "Resolved" });

const options = {
  hostname: '127.0.0.1',
  port: 8000,
  path: '/api/admin/fixit/TKT-100',
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.on('data', (chunk) => {
    console.log(`BODY: ${chunk}`);
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
