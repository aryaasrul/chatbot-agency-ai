const knowledgeBase = require('./knowledgeBase');

/**
 * Fungsi untuk mencari jawaban rules-based dari knowledge base.
 * @param {string} message - Pesan user (plain text)
 * @returns {string|null} - Jawaban jika match, null jika tidak ada match
 */
function findRuleBasedAnswer(message) {
  const lowerMsg = message.toLowerCase();
  for (const item of knowledgeBase) {
    if (item.patterns.some(pattern => lowerMsg.includes(pattern))) {
      return item.answer;
    }
  }
  return null;
}

module.exports = { findRuleBasedAnswer };