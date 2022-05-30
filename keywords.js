const fs = require("fs");
const validator = require("validator");
const keywordsstr = fs.readFileSync("keywords.txt").toString();
const keywords = keywordsstr.split("\n");

let cnt = 0;
for (let i = 0; i < keywords.length; i++) {
  if (validator.isAlpha(keywords[i])) cnt++;
}

console.log(cnt);

module.exports = keywords;
