const path = require("path");

function readLog(fileSlug, logDirectory) {
  let date = new Date().toISOString().substr(0, 10);
  let dir = path.join(path.resolve("."), logDirectory, date);

  let filepath = path.join(dir, `${fileSlug}`);
  return require(filepath);
}

module.exports = readLog;