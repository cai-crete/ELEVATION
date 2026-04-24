import https from 'https';
https.get('https://cai-sketch-to-image-v2.vercel.app/', (resp) => {
  let data = '';
  resp.on('data', (chunk) => { data += chunk; });
  resp.on('end', () => { console.log(data); });
}).on("error", (err) => { console.log("Error: " + err.message); });
