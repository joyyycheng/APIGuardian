const natural = require("natural");

const Analyzer = natural.SentimentAnalyzer;
const stemmer = natural.PorterStemmer;
const analyzer = new Analyzer("English", stemmer, "afinn");

function interpretSentiment(score) {
    if (score > 0) return "Positive";
    if (score === 0) return "Neutral";
    if (score < -0.1) return "Negative";
  }

async function findSimilarTexts(texts) {

    const similarTexts = [];
    for(var i = 0; i < texts.length; i++)
    {
        texts[i] = String(texts[i]);
        if(texts[i].startsWith("4") || texts[i].startsWith("5"))
        {   
            texts[i] = "error"
        } else if (texts[i].startsWith("2"))
        {
            texts[i] = "success"
        }
        const result = analyzer.getSentiment([texts[i]]);
        const humanReadable = interpretSentiment(result);

        similarTexts.push(humanReadable);
    }

    return similarTexts;
}


module.exports = {
  findSimilarTexts
};