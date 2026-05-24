import {
  translateCpuLoad,
  cpuLoadColor,
  translateRamUsage,
  ramUsageColor,
  translateCpuTemp,
  cpuTempColor,
  deriveWeather,
  weatherColor,
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

  describe('translateCpuTemp', () => {
    it('returns "temperature unknown" for 0 or negative', () => {
      expect(translateCpuTemp(0)).toBe('temperature unknown');
      expect(translateCpuTemp(-5)).toBe('temperature unknown');
    });

    it('returns "comfortable" for normal temps (1-60)', () => {
      expect(translateCpuTemp(1)).toBe('comfortable');
      expect(translateCpuTemp(30)).toBe('comfortable');
      expect(translateCpuTemp(60)).toBe('comfortable');
    });

    it('returns "warm, slightly feverish" for warning temps (61-80)', () => {
      expect(translateCpuTemp(61)).toBe('warm, slightly feverish');
      expect(translateCpuTemp(70)).toBe('warm, slightly feverish');
      expect(translateCpuTemp(80)).toBe('warm, slightly feverish');
    });

    it('returns "burning up, dangerously hot" for critical temps (81+)', () => {
      expect(translateCpuTemp(81)).toBe('burning up, dangerously hot');
      expect(translateCpuTemp(100)).toBe('burning up, dangerously hot');
    });
  });

  describe('cpuTempColor', () => {
    it('returns gray for unknown temp', () => {
      expect(cpuTempColor(0)).toBe('#9ca3af');
      expect(cpuTempColor(-10)).toBe('#9ca3af');
    });

    it('returns green for normal temp', () => {
      expect(cpuTempColor(1)).toBe('#4ade80');
      expect(cpuTempColor(60)).toBe('#4ade80');
    });

    it('returns yellow for warning temp', () => {
      expect(cpuTempColor(61)).toBe('#facc15');
      expect(cpuTempColor(80)).toBe('#facc15');
    });

    it('returns red for critical temp', () => {
      expect(cpuTempColor(81)).toBe('#ef4444');
      expect(cpuTempColor(100)).toBe('#ef4444');
    });
  });

  describe('deriveWeather', () => {
    it('returns sunny when all metrics comfortable', () => {
      expect(deriveWeather({ cpuLoad: 10, ramUsage: 20, cpuTemp: 40, uptime: 0, processes: [] })).toBe('sunny');
    });

    it('returns cloudy when one metric warm', () => {
      expect(deriveWeather({ cpuLoad: 65, ramUsage: 20, cpuTemp: 40, uptime: 0, processes: [] })).toBe('cloudy');
    });

    it('returns rainy when two metrics warm', () => {
      expect(deriveWeather({ cpuLoad: 65, ramUsage: 65, cpuTemp: 40, uptime: 0, processes: [] })).toBe('rainy');
    });

    it('returns stormy when any metric critical', () => {
      expect(deriveWeather({ cpuLoad: 90, ramUsage: 20, cpuTemp: 40, uptime: 0, processes: [] })).toBe('stormy');
      expect(deriveWeather({ cpuLoad: 10, ramUsage: 85, cpuTemp: 40, uptime: 0, processes: [] })).toBe('stormy');
      expect(deriveWeather({ cpuLoad: 10, ramUsage: 20, cpuTemp: 85, uptime: 0, processes: [] })).toBe('stormy');
    });
  });

  describe('weatherColor', () => {
    it('returns correct hex for each weather', () => {
      expect(weatherColor('sunny')).toBe('#87ceeb');
      expect(weatherColor('cloudy')).toBe('#b0c4de');
      expect(weatherColor('rainy')).toBe('#708090');
      expect(weatherColor('stormy')).toBe('#2f4f4f');
    });
  });
});

