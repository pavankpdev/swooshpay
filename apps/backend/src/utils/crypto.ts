import { randomBytes, scrypt as _scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

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
