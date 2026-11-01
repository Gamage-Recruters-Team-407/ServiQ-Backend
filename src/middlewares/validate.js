// validate({ body, params, query }) -> parsed values stored on req.valid.
// (Express 5 makes req.query read-only, so parsed values never overwrite req.*)
const validate = (schemas) => (req, res, next) => {
  req.valid = req.valid || {};
  for (const key of ["params", "query", "body"]) {
    if (schemas[key]) req.valid[key] = schemas[key].parse(req[key] ?? {});
  }
  next();
};

module.exports = validate;
