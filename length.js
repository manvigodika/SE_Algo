const fs = require("fs");
const lengthstr = fs.readFileSync("length.txt").toString();
const length = lengthstr.split("\n");
// console.log(length);
for (let i = 0; i < length.length; i++) {
  length[i] = Number(length[i]);
}

// console.log(length);

module.exports = length;
