import axios from 'axios';
import fs from 'fs';

const OUTBOX_PATH =
  process.env.EMAIL_OUTBOX_PATH || '/tmp/swooshpay-emails.jsonl';
const otpRegex = /\b(\d{6})\b/;

function makeMockUser() {
  const uid = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  return {
    username: `testuser_${uid}`,
    fullname: 'Test User',
    email: `testuser+${uid}@test.com`,
    password: 'testpassword',
  };
}

function readLatestOtp(to: string, afterISO?: string): string | null {
  try {
    if (!fs.existsSync(OUTBOX_PATH)) return null;
    const content = fs.readFileSync(OUTBOX_PATH, 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const rec = JSON.parse(lines[i]);
        if (rec.to === to && (!afterISO || rec.timestamp >= afterISO)) {
          const m = String(rec.body).match(otpRegex);
          if (m) return m[1];
        }
      } catch (err) {
        console.log(err);
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function waitForOtp(
  to: string,
  afterISO?: string,
  timeoutMs = 5000,
  intervalMs = 100
): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const code = readLatestOtp(to, afterISO);
    if (code) return code;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`OTP not found for ${to}`);
}

describe('Check health status', () => {
  it('should return a message', async () => {
    const res = await axios.get(`/api/health`);

    expect(res.status).toBe(200);
    expect(res.data).toEqual('All Good!');
  });
});

describe('Register and confirm a user', () => {
  it('registers a new user and returns a verification token', async () => {
    const user = makeMockUser();

    const res = await axios.post(`/api/auth/register`, user);

    expect(res.status).toBe(201);
    expect(res.data.data).toHaveProperty('accessToken');
    expect(res.data.data).toHaveProperty('message');
  });

  it('confirms the newly registered user via OTP from outbox', async () => {
    const user = makeMockUser();
    const startedAt = new Date().toISOString();

    const reg = await axios.post(`/api/auth/register`, user);
    expect(reg.status).toBe(201);
    expect(reg.status).toBeLessThan(300);

    const token = reg.data.data.accessToken as string;

    const otp = await waitForOtp(user.email, startedAt);

    const confirm = await axios.post(
      `/api/auth/confirm`,
      { otp },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    expect(confirm.status).toBe(200);
    expect(confirm.status).toBeLessThan(300);
    expect(confirm.data.data.message).toMatch(/confirmed/i);
  });
});

describe('Reset password flow', () => {
  const user = makeMockUser();
  beforeAll(async () => {
    let res = await axios.post(`/api/auth/register`, user);
    expect(res.status).toBe(201);
    expect(res.data.data).toHaveProperty('accessToken');
    expect(res.data.data).toHaveProperty('message');

    const token = res.data.data.accessToken as string;

    const otp = await waitForOtp(user.email);

    res = await axios.post(
      `/api/auth/confirm`,
      { otp },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    expect(res.status).toBe(200);
  });

  it('should be able to reset password immediately before expiry', async () => {
    let res = await axios.post(`/api/auth/forgot-password`, {
      email: user.email,
    });
    expect(res.status).toBe(200);
    expect(res.data.data).toHaveProperty('accessToken');
    expect(res.data.data).toHaveProperty('message');

    const forgotPwdToken = res.data.data.accessToken as string;

    const otp = await waitForOtp(user.email);

    res = await axios.post(
      `/api/auth/verify/reset-password`,
      { otp },
      { headers: { Authorization: `Bearer ${forgotPwdToken}` } }
    );

    expect(res.status).toBe(200);
    expect(res.status).toBeLessThan(300);
    expect(res.data.data).toHaveProperty('accessToken');
    expect(res.data.data).toHaveProperty('message');

    const resetPwdToken = res.data.data.accessToken as string;
    console.log(resetPwdToken);

    res = await axios.post(
      `/api/auth/reset-password`,
      { newPassword: 'newpassword', otp },
      { headers: { Authorization: `Bearer ${resetPwdToken}` } }
    );

    expect(res.status).toBe(200);
    expect(res.data.data).toHaveProperty('message');
  });
});
