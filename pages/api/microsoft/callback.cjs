const handleMicrosoftCallback = require("../../../lib/ms-oauth");

module.exports = function handler(req, res) {
  return handleMicrosoftCallback(req, res);
};
