const { promises: fs } = require("fs");
const path = require("path");

const TOKENS_PATH = path.join(process.cwd(), ".aktonz-ms-tokens.json");

async function saveTokens(data) {
  await fs.writeFile(TOKENS_PATH, JSON.stringify(data, null, 2), "utf8");
}

async function readTokens() {
  try {
    const s = await fs.readFile(TOKENS_PATH, "utf8");
    return JSON.parse(s);
  } catch {
    return null;
  }
}

module.exports = {
  saveTokens,
  readTokens,
};
