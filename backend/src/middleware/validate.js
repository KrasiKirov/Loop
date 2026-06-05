// validate(schema, source) — 400s on malformed input. Does not mutate req
// (handlers read the same raw values; this is a gate, not a transformer).
const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid input' });
  }
  next();
};

module.exports = { validate };
