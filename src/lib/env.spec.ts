import { describe, expect, it } from 'vitest';
import { parseEnvPositiveInt } from './env';

describe('parseEnvPositiveInt', () => {
  const fallback = 3600000;

  it('should use fallback when raw is undefined (未設定)', () => {
    expect(parseEnvPositiveInt(undefined, fallback)).toBe(fallback);
  });

  it('should use fallback when raw is empty string (空文字)', () => {
    expect(parseEnvPositiveInt('', fallback)).toBe(fallback);
  });

  it('should use fallback when raw is non-numeric (非数値)', () => {
    expect(parseEnvPositiveInt('abc', fallback)).toBe(fallback);
  });

  it('should use fallback when raw is 0 (0)', () => {
    expect(parseEnvPositiveInt('0', fallback)).toBe(fallback);
  });

  it('should use fallback when raw is negative (負数)', () => {
    expect(parseEnvPositiveInt('-100', fallback)).toBe(fallback);
  });

  it('should use fallback when raw is NaN-like', () => {
    expect(parseEnvPositiveInt('NaN', fallback)).toBe(fallback);
  });

  it('should return the integer when raw is a positive number (正常値)', () => {
    expect(parseEnvPositiveInt('3600000', fallback)).toBe(3600000);
  });

  it('should floor a positive decimal to an integer', () => {
    expect(parseEnvPositiveInt('5.9', fallback)).toBe(5);
  });
});
