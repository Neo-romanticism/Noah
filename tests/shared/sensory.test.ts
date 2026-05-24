import {
  translateCpuLoad,
  cpuLoadColor,
  translateRamUsage,
  ramUsageColor,
} from '../../src/shared/utils/sensory.js';

describe('sensory translation', () => {

  describe('translateCpuLoad', () => {
    it('returns "cool and relaxed" for low load (0-30)', () => {
      expect(translateCpuLoad(0)).toBe('cool and relaxed');
      expect(translateCpuLoad(15)).toBe('cool and relaxed');
      expect(translateCpuLoad(30)).toBe('cool and relaxed');
    });

    it('returns "warm and active" for medium load (31-60)', () => {
      expect(translateCpuLoad(31)).toBe('warm and active');
      expect(translateCpuLoad(45)).toBe('warm and active');
      expect(translateCpuLoad(60)).toBe('warm and active');
    });

    it('returns "hot, working hard" for high load (61-85)', () => {
      expect(translateCpuLoad(61)).toBe('hot, working hard');
      expect(translateCpuLoad(75)).toBe('hot, working hard');
      expect(translateCpuLoad(85)).toBe('hot, working hard');
    });

    it('returns "overheating, struggling" for very high load (86-100)', () => {
      expect(translateCpuLoad(86)).toBe('overheating, struggling');
      expect(translateCpuLoad(100)).toBe('overheating, struggling');
    });
  });

  describe('cpuLoadColor', () => {
    it('returns green for low load', () => {
      expect(cpuLoadColor(0)).toBe('#4ade80');
      expect(cpuLoadColor(30)).toBe('#4ade80');
    });

    it('returns yellow for medium load', () => {
      expect(cpuLoadColor(31)).toBe('#facc15');
      expect(cpuLoadColor(60)).toBe('#facc15');
    });

    it('returns orange for high load', () => {
      expect(cpuLoadColor(61)).toBe('#fb923c');
      expect(cpuLoadColor(85)).toBe('#fb923c');
    });

    it('returns red for very high load', () => {
      expect(cpuLoadColor(86)).toBe('#ef4444');
      expect(cpuLoadColor(100)).toBe('#ef4444');
    });
  });

  describe('translateRamUsage', () => {
    it('returns "light and spacious" for low usage (0-50)', () => {
      expect(translateRamUsage(0)).toBe('light and spacious');
      expect(translateRamUsage(10)).toBe('light and spacious');
      expect(translateRamUsage(50)).toBe('light and spacious');
    });

    it('returns "getting crowded" for medium usage (51-80)', () => {
      expect(translateRamUsage(51)).toBe('getting crowded');
      expect(translateRamUsage(70)).toBe('getting crowded');
      expect(translateRamUsage(80)).toBe('getting crowded');
    });

    it('returns "stuffed, can barely breathe" for high usage (81-100)', () => {
      expect(translateRamUsage(81)).toBe('stuffed, can barely breathe');
      expect(translateRamUsage(99)).toBe('stuffed, can barely breathe');
      expect(translateRamUsage(100)).toBe('stuffed, can barely breathe');
    });
  });

  describe('ramUsageColor', () => {
    it('returns blue for low usage', () => {
      expect(ramUsageColor(0)).toBe('#60a5fa');
      expect(ramUsageColor(50)).toBe('#60a5fa');
    });

    it('returns purple for medium usage', () => {
      expect(ramUsageColor(51)).toBe('#a78bfa');
      expect(ramUsageColor(80)).toBe('#a78bfa');
    });

    it('returns pink for high usage', () => {
      expect(ramUsageColor(81)).toBe('#f472b6');
      expect(ramUsageColor(100)).toBe('#f472b6');
    });
  });
});

