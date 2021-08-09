const fs = require("fs");
const fsp = fs.promises;
const path = require("path");

async function writeLog(fileSlug, rawResult, logDirectory) {
  let date = new Date().toISOString().substr(0, 10);
  let dir = path.join(path.resolve("."), logDirectory, date);
  await fsp.mkdir(dir, {
    recursive: true
  });

  let filepath = path.join(dir, `${fileSlug}`);
  return fsp.writeFile(filepath, JSON.stringify(rawResult, null, 2));
}

module.exports = writeLog;