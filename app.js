const express = require("express");
const app = express();
const ejs = require("ejs");
const { removeStopwords } = require("stopword");
const removePunc = require("remove-punctuation");
const natural = require("natural");
const spellChecker = require("simple-spellchecker");
const lemmatizer = require("wink-lemmatizer");
const IDF = require("./idf");
const keywords = require("./keywords");
const length = require("./length");
var converter = require("number-to-words");
// const TFIDF = require("./TFIDF");
let TF = require("./TF");
const fs = require("fs");
const path = require("path");
const cosineSimilarity = require("./cosine_similarity");
const stringSimilarity = require("string-similarity");

const { wordsToNumbers } = require("words-to-numbers");
const titles = require("./titles");
const urls = require("./urls");
const N = 3023;
const W = 27602;
const avgdl = 138.27125372146875;

Object.defineProperty(String.prototype, "capitalize", {
  value: function () {
    return this.charAt(0).toUpperCase() + this.slice(1);
  },
  enumerable: false,
});

let recentSearches = [];

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "/public")));

const spellcheck = new natural.Spellcheck(keywords); // MAKING DICTIONARY
// console.log(tfidf);
app.get("/", (req, res) => {
  //   res.send("Hello");
  res.render("index");
});

app.get("/search", (req, res) => {
  const query = req.query.query;
  const oldString = query.split(" ");
  const newString = removeStopwords(oldString);
  newString.sort(); // newString is an array
  let queryKeywords = [];

  let getNum = query.match(/\d+/g);

  // console.log(getNum);

  if (getNum) {
    getNum.forEach((num) => {
      queryKeywords.push(num);
      let numStr = converter.toWords(Number(num));
      console.log("numStr", numStr);
      let numKeys = numStr.split("-");
      // console.log(numKeys);
      queryKeywords.push(numStr);

      numKeys.forEach((key) => {
        let spaceSplits = key.split(" ");
        if (numKeys.length > 1) queryKeywords.push(key);
        if (spaceSplits.length > 1)
          spaceSplits.forEach((key) => {
            queryKeywords.push(key);
          });
      });
    });
  }

  for (let j = 0; j < newString.length; j++) {
    newString[j] = newString[j].toLowerCase();
    newString[j] = removePunc(newString[j]);
    if (newString[j] !== "") queryKeywords.push(newString[j]);

    var letr = newString[j].match(/[a-zA-Z]+/g);
    if (letr) {
      letr.forEach((w) => {
        queryKeywords.push(removePunc(w.toLowerCase()));
      });
    }

    let x = wordsToNumbers(newString[j]).toString();
    if (x != newString[j]) queryKeywords.push(x);
  }

  let queryKeywordsNew = queryKeywords;
  queryKeywords.forEach((key) => {
    let key1 = key;
    console.log("k", key);
    let key2 = lemmatizer.verb(key1);
    queryKeywordsNew.push(key2);
    let spellkey1 = spellcheck.getCorrections(key1, 1);
    let spellkey2 = spellcheck.getCorrections(key2, 1);
    if (spellkey1.indexOf(key1) == -1) {
      spellkey1.forEach((k1) => {
        queryKeywordsNew.push(k1);
        queryKeywordsNew.push(lemmatizer.verb(k1));
      });
    }

    if (spellkey2.indexOf(key2) == -1) {
      spellkey2.forEach((k2) => {
        queryKeywordsNew.push(k2);
        queryKeywordsNew.push(lemmatizer.verb(k2));
      });
    }

    console.log(key1, key2);
    console.log(spellkey1, spellkey2);

    console.log(queryKeywordsNew);
  });

  queryKeywords = queryKeywordsNew; // updating the querykeywords array
  console.log(queryKeywords);
  // now we need to filter out those keywords which are present in our corpse
  let temp = [];
  for (let i = 0; i < queryKeywords.length; i++) {
    const id = keywords.indexOf(queryKeywords[i]);
    if (id !== -1) {
      temp.push(queryKeywords[i]);
    }
  }

  queryKeywords = temp;
  queryKeywords.sort();

  let qTF = new Array(W).fill(0);
  let qTFIDF = new Array(W).fill(0);
  let map = new Map();
  queryKeywords.forEach((key) => {
    return map.set(key, 0);
  });

  queryKeywords.forEach((key) => {
    let cnt = map.get(key);
    cnt++;
    return map.set(key, cnt);
  });

  console.log(queryKeywords, "HELLO");

  queryKeywords.forEach((key) => {
    const id = keywords.indexOf(key);
    if (id !== -1) {
      qTF[id] = map.get(key) / queryKeywords.length;
      qTFIDF[id] = qTF[id] * IDF[id];
    }
  });

  let temp1 = [];
  queryKeywords.forEach((key) => {
    if (temp1.indexOf(key) == -1) {
      temp1.push(key);
    }
  });

  queryKeywords = temp1;
  let qid = [];
  queryKeywords.forEach((key) => {
    qid.push(keywords.indexOf(key));
  });

  // SIMILARITY OF EACH DOC WITH QUERY STRING
  const arr = [];

  // console.log(TF);
  // console.log(qid);
  // console.log(keywords[2907], key)
  for (let i = 0; i < N; i++) {
    // const s = cosineSimilarity(TFIDF[i], qTFIDF);

    // const titleKeywords =

    let s = 0;
    qid.forEach((key) => {
      // console.log(keywords[key]);
      const idfKey = IDF[key];
      let tf = 0;
      for (let k = 0; k < TF[i].length; k++) {
        if (TF[i][k].id == key) {
          tf = TF[i][k].val / length[i];

          break;
        }
      }
      const tfkey = tf;
      const x = tfkey * (1.2 + 1);
      const y = tfkey + 1.2 * (1 - 0.75 + 0.75 * (length[i] / avgdl));
      let BM25 = (x / y) * idfKey;
      if (i < 2214) BM25 *= 2;
      s += BM25;
    });

    const titSim = stringSimilarity.compareTwoStrings(titles[i], query);
    s *= titSim;

    arr.push({ id: i, sim: s });
  }

  arr.sort((a, b) => b.sim - a.sim);
  let response = [];
  // console.log("REACHED");
  for (let i = 0; i < 10; i++) {
    // console.log(arr[i]);
    // response.push(titles[arr[i].id]);
    const str = path.join(__dirname, "Problems");
    const str1 = path.join(str, `problem_text_${arr[i].id + 1}.txt`);
    let question = fs.readFileSync(str1).toString().split("\n");
    let n = question.length;
    let problem = "";
    console.log(i);
    if (arr[i].id <= 1773) {
      problem = question[0].split("ListShare")[1] + " ";
      if (n > 1) problem += question[1];
    } else {
      problem = question[0] + " ";
      if (n > 1) problem += question[1];
    }
    response.push({
      id: arr[i].id,
      title: titles[arr[i].id],
      problem: problem,
    });
  }

  console.log(response);

  // res.locals.titles = response;
  setTimeout(() => {
    res.json(response);
  }, 1000);
});

app.get("/question/:id", (req, res) => {
  const id = Number(req.params.id);
  const str = path.join(__dirname, "Problems");
  const str1 = path.join(str, `problem_text_${id + 1}.txt`);
  let text = fs.readFileSync(str1).toString();
  // console.log(text);
  if (id <= 1773) {
    text = text.split("ListShare");
    text = text[1];
  }

  // console.log(text.indexOf("\n"));

  // text.replace("\n", "<br/>");

  var find = "\n";
  var re = new RegExp(find, "g");

  text = text.replace(re, "<br/>");
  // console.log(text);

  // console.log("Before Error");

  let title = titles[id];
  title = title.split("-");
  let temp = "";
  for (let i = 0; i < title.length; i++) {
    temp += title[i] + " ";
  }
  title = temp;
  title = title.capitalize();
  let type = 0;
  if (id < 1774) type = "Leetcode";
  else if (id < 2214) type = "Interview Bit";
  else type = "Techdelight";
  const questionObject = {
    title,
    link: urls[id],
    value: text,
    type,
  };

  // console.log(questionObject.value);
  res.locals.questionObject = questionObject;

  res.locals.questionBody = text;
  res.locals.questionTitle = titles[id];
  res.locals.questionUrl = urls[id];
  res.render("question");
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log("Server is runnning on port " + port);
});
