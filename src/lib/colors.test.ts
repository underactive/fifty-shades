import { describe, expect, it } from 'vitest';
import {
  hexToHsl,
  isNeutral,
  normalizeHex,
  readableTextColor,
  sortByRoygbiv,
} from './colors';

describe('normalizeHex', () => {
  it('expands shorthand and strips #', () => {
    expect(normalizeHex('#f00')).toBe('ff0000');
    expect(normalizeHex('ABCDEF')).toBe('abcdef');
  });
  it('falls back to black on garbage', () => {
    expect(normalizeHex('nope')).toBe('000000');
  });
});

describe('hexToHsl', () => {
  it('computes hue for primaries', () => {
    expect(Math.round(hexToHsl('#ff0000').h)).toBe(0);
    expect(Math.round(hexToHsl('#00ff00').h)).toBe(120);
    expect(Math.round(hexToHsl('#0000ff').h)).toBe(240);
  });
});

describe('isNeutral', () => {
  it('flags grays and not vivid colors', () => {
    expect(isNeutral('#000000')).toBe(true);
    expect(isNeutral('#ffffff')).toBe(true);
    expect(isNeutral('#808080')).toBe(true);
    expect(isNeutral('#ff5500')).toBe(false);
  });
});

describe('sortByRoygbiv', () => {
  it('orders chromatic colors as a rainbow and pushes neutrals last', () => {
    const input = ['#000000', '#0000ff', '#ff0000', '#ffffff', '#00ff00', '#ffff00'];
    const sorted = sortByRoygbiv(input, (h) => h);
    expect(sorted).toEqual([
      '#ff0000', // red
      '#ffff00', // yellow
      '#00ff00', // green
      '#0000ff', // blue
      '#000000', // neutral: black (dark)
      '#ffffff', // neutral: white (light)
    ]);
  });

  it('keeps wrap-around crimson reds (hue ~350) at the front, not after violet', () => {
    // #c8102e is a crimson red at hue ~350; it must lead, before violet.
    const sorted = sortByRoygbiv(['#5b2a86', '#1f6fd6', '#c8102e', '#f4c20d'], (h) => h);
    expect(sorted).toEqual([
      '#c8102e', // crimson red
      '#f4c20d', // yellow
      '#1f6fd6', // blue
      '#5b2a86', // violet
    ]);
  });
});

describe('readableTextColor', () => {
  it('returns dark text on light backgrounds and vice versa', () => {
    expect(readableTextColor('#ffff00')).toBe('#161616');
    expect(readableTextColor('#1b1b2a')).toBe('#ffffff');
  });
});
