const crypto = require('crypto');

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const generateReference = () => {
  return `SPB-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
};

const paginate = (page = 1, limit = 10) => {
  const offset = (parseInt(page) - 1) * parseInt(limit);
  return { limit: parseInt(limit), offset };
};

const paginateResponse = (data, total, page, limit) => ({
  data,
  pagination: {
    total: parseInt(total),
    page: parseInt(page),
    limit: parseInt(limit),
    pages: Math.ceil(total / limit),
  },
});

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { generateOTP, generateReference, paginate, paginateResponse, asyncHandler };
