function isValidObjectId(value) {
  return typeof value === 'string' && /^[0-9a-f]{24}$/i.test(value);
}

module.exports = { isValidObjectId };
