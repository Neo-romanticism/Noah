import {
  translateCpuLoad,
  cpuLoadColor,
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
});
