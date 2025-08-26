import {
  randomBytes,
  scrypt as _scrypt,
  timingSafeEqual,
  createHmac,
} from 'crypto';
import { promisify } from 'util';
import { env } from '../env';

const scrypt = promisify(_scrypt);
export const hashPassword = async (password: string) => {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scrypt(password, salt, 64)) as Buffer;
  return `${buf.toString('hex')}:${salt}`;
};

export const comparePassword = async (password: string, hash: string) => {
  const [hashValue, salt] = hash.split(':');
  const buf = (await scrypt(password, salt, 64)) as Buffer;
  return timingSafeEqual(buf, Buffer.from(hashValue, 'hex'));
};

export const createHash = (value: string) => {
  return createHmac('sha256', env.OTP_PEPPER).update(value).digest();
};

export const verifyHash = (value: Buffer, hash: Buffer) => {
  return value.length === hash.length && timingSafeEqual(value, hash);
};
