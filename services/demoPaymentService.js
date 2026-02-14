const crypto = require("crypto");

function generateRef() {
  return "DP-" + crypto.randomBytes(6).toString("hex").toUpperCase();
}

// Card rules:
// 4242 → success
// 0000 → decline
// otherwise 90% success
function processCard(cardNumber) {
  if (!cardNumber) return { success: false, reason: "No card provided" };

  const clean = cardNumber.replace(/\s/g, "");

  if (clean.endsWith("0000")) {
    return { success: false, reason: "Card declined" };
  }

  if (clean.endsWith("4242")) {
    return { success: true };
  }

  // random realism
  if (Math.random() < 0.1) {
    return { success: false, reason: "Bank rejected transaction" };
  }

  return { success: true };
}

module.exports = { generateRef, processCard };
