const path = require("path");
const fs = require("fs");

function readLog(fileSlug, logDirectory) {
  let date = new Date().toISOString().substr(0, 10);
  let dir = path.join(path.resolve("."), logDirectory, date);

  let filepath = path.join(dir, `${fileSlug}`);
  if(fs.existsSync(filepath)) {
    return require(filepath);
  }
  return false;
}

module.exports = readLog;