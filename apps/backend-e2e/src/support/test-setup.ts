import axios from 'axios';

module.exports = async function () {
  // Force CI-like environment for e2e to select the Outbox email provider.
  process.env.NODE_ENV = 'CI';
  process.env.EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || 'outbox';
  process.env.EMAIL_OUTBOX_PATH =
    process.env.EMAIL_OUTBOX_PATH || '/tmp/swooshpay-emails.jsonl';

  // Configure axios for tests to use.
  const host = process.env.HOST ?? 'localhost';
  const port = process.env.PORT ?? '3000';
  axios.defaults.baseURL = `http://${host}:${port}`;
};
