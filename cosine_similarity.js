const cosineSimilarity = (v1, v2) => {
  if (v1.length != v2.length) return 0;
  const l = v1.length;
  let mod1 = 0,
    mod2 = 0,
    dot = 0;
  for (let i = 0; i < l; i++) {
    dot += v1[i] * v2[i];
    mod1 += v1[i] * v1[i];
    mod2 += v2[i] * v2[i];
  }

  mod1 = Math.sqrt(mod1);
  mod2 = Math.sqrt(mod2);

  return dot / (mod1 * mod2);
};

module.exports = cosineSimilarity;
