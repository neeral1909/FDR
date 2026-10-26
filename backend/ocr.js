const Tesseract = require("tesseract.js");

async function readFDR(filePath) {
  const result = await Tesseract.recognize(
    filePath,
    "eng"
  );

  return result.data.text;
}

module.exports = readFDR;