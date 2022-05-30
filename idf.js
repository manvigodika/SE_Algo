const fs = require("fs");
const idfstr = fs.readFileSync("IDF.txt").toString();
const idf = idfstr.split("\n");
// console.log(idf);
for (let i = 0; i < idf.length; i++) {
  idf[i] = Number(idf[i]);
}

// console.log(idf);

module.exports = idf;
