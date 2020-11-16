const path = require("path");
const fs = require("fs");

function readLogFromDate(dateObj, fileSlug, logDirectory) {
  let date = dateObj.toISOString().substr(0, 10);
  let dir = path.join(path.resolve("."), logDirectory, date);
  
  let filepath = path.join(dir, `${fileSlug}`);
  if(fs.existsSync(filepath)) {
    return require(filepath);
  }
  return false;
}

function readLog(fileSlug, logDirectory) {
  let result = readLogFromDate(new Date(), fileSlug, logDirectory);
  if(result !== false) {
    return result;
  }

  let yesterday = new Date();
  yesterday.setTime(yesterday.getTime() - 1000*60*60*23);
  return readLogFromDate(yesterday, fileSlug, logDirectory);
}

module.exports = readLog;