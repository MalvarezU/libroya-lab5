const { ZodError } = require('zod');

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issues = result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      }));
      return next({ status: 400, message: 'Validation error', errors: issues });
    }
    req.body = result.data;
    return next();
  };
}

// Helper to surface ZodError if thrown elsewhere
function formatZodError(err) {
  if (err instanceof ZodError) {
    return err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
  }
  return null;
}

module.exports = { validate, formatZodError };