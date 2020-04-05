const fs = require("fs-extra");
const path = require("path");

async function writeLog(fileSlug, rawResult, logDirectory) {
  let date = new Date().toISOString().substr(0, 10);
  let dir = path.join(path.resolve("."), logDirectory, date);
  await fs.ensureDir(dir);

  let filepath = path.join(dir, `${fileSlug}`);
  return fs.writeJson(filepath, rawResult, { spaces: 2 });
}

module.exports = writeLog;