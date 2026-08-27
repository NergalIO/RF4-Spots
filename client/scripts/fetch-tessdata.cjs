const fs = require("fs");
const path = require("path");
const https = require("https");

const dest = path.join(__dirname, "..", "electron", "tessdata");
const files = ["eng.traineddata.gz", "rus.traineddata.gz"];
const base = "https://github.com/naptha/tessdata/raw/gh-pages/4.0.0/";

function download(name) {
  const target = path.join(dest, name);
  if (fs.existsSync(target) && fs.statSync(target).size > 1000) return Promise.resolve();
  fs.mkdirSync(dest, { recursive: true });
  return new Promise((resolve, reject) => {
    const out = fs.createWriteStream(target);
    https
      .get(base + name, { headers: { "user-agent": "rf4-spots-tessdata" } }, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          https.get(res.headers.location, (res2) => {
            res2.pipe(out);
            out.on("finish", () => {
              out.close();
              resolve();
            });
          }).on("error", reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`tessdata ${name}: HTTP ${res.statusCode}`));
          return;
        }
        res.pipe(out);
        out.on("finish", () => {
          out.close();
          resolve();
        });
      })
      .on("error", reject);
  });
}

async function main() {
  for (const name of files) {
    process.stdout.write(`tessdata ${name}… `);
    await download(name);
    console.log("ok");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
