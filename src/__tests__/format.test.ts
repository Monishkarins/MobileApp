import { formatINR, fmtNum, expiryVariant } from '../utils/format';

describe('formatINR', () => {
  it('formats full Indian rupee grouping', () => {
    expect(formatINR(320355)).toBe('₹3,20,355');
  });
  it('formats compact lakhs/crores/thousands', () => {
    expect(formatINR(5911000, true)).toBe('₹59.11L');
    expect(formatINR(13900, true)).toBe('₹13.9K');
    expect(formatINR(20000000, true)).toBe('₹2.00Cr');
  });
});

describe('fmtNum', () => {
  it('compacts thousands', () => {
    expect(fmtNum(12900)).toBe('12.9K');
    expect(fmtNum(175)).toBe('175');
  });
});

describe('expiryVariant', () => {
  it('flags expired as danger and far-future as success', () => {
    expect(expiryVariant('2000-01-01')).toBe('danger');
    expect(expiryVariant('2999-01-01')).toBe('success');
    expect(expiryVariant(undefined)).toBe('neutral');
  });
});
