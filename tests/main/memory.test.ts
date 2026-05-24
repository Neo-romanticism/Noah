import fs from 'fs';
import path from 'path';
import os from 'os';

import { MemoryStore } from '../../src/main/memory/index.js';
import { classifyMemoryType, calculateDecay, getInitialDecay, getDecayRate, getDecayFloor } from '../../src/main/memory/decay.js';
import type { MemoryEvent, MemoryEventType } from '../../src/shared/types/index.js';

describe('MemoryStore', () => {
  let dataDir: string;
  let store: MemoryStore;

  beforeEach(() => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'noah-memory-test-'));
    store = new MemoryStore(dataDir);
  });

  afterEach(() => {
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  // ── Record ───────────────────────────────────────────────
  describe('record', () => {
    it('creates an event with id, timestamp, and decay', () => {
      const event = store.record({
        type: 'fed',
        severity: 3,
        context: {
          emotion: 'happy',
          affection: 50,
          morality: 50,
          hunger: 30,
          fatigue: 20,
          trauma: 0,
        },
        description: 'User fed Noah',
      });

      expect(event.id).toBeDefined();
      expect(event.id.length).toBeGreaterThan(0);
      expect(event.timestamp).toBeGreaterThan(0);
      expect(event.decay).toBe(1.0);
      expect(event.type).toBe('fed');
      expect(event.severity).toBe(3);
      expect(event.description).toBe('User fed Noah');
    });

    it('increments event count', () => {
      expect(store.getEventCount()).toBe(0);
      store.record({ type: 'petted', severity: 2, context: { emotion: 'happy', affection: 50, morality: 50, hunger: 30, fatigue: 20, trauma: 0 } });
      expect(store.getEventCount()).toBe(1);
      store.record({ type: 'clicked', severity: 1, context: { emotion: 'happy', affection: 50, morality: 50, hunger: 30, fatigue: 20, trauma: 0 } });
      expect(store.getEventCount()).toBe(2);
    });

    it('prunes events over max capacity', () => {
      // Record many events to test pruning
      for (let i = 0; i < 1010; i++) {
        store.record({ type: 'clicked', severity: 1, context: { emotion: 'happy', affection: 50, morality: 50, hunger: 30, fatigue: 20, trauma: 0 } });
      }
      expect(store.getEventCount()).toBeLessThanOrEqual(1000);
    });
  });

  // ── Retrieval ────────────────────────────────────────────
  describe('retrieval', () => {
    beforeEach(() => {
      store.record({ type: 'fed', severity: 3, context: { emotion: 'happy', affection: 50, morality: 50, hunger: 30, fatigue: 20, trauma: 0 }, description: 'fed' });
      store.record({ type: 'petted', severity: 2, context: { emotion: 'happy', affection: 50, morality: 50, hunger: 30, fatigue: 20, trauma: 0 }, description: 'petted' });
      store.record({ type: 'terminated', severity: 10, context: { emotion: 'traumatized', affection: 0, morality: 50, hunger: 30, fatigue: 20, trauma: 80 }, description: 'terminated' });
    });

    it('getAll returns all events', () => {
      const all = store.getAll();
      expect(all).toHaveLength(3);
    });

    it('getRecent returns most recent events in reverse order', () => {
      const recent = store.getRecent(2);
      expect(recent).toHaveLength(2);
      expect(recent[0]?.description).toBe('terminated');
      expect(recent[1]?.description).toBe('petted');
    });

    it('getByType returns events of a specific type', () => {
      const fed = store.getByType('fed');
      expect(fed).toHaveLength(1);
      expect(fed[0]?.description).toBe('fed');
    });

    it('getByTimeRange returns events within range', () => {
      const now = Math.floor(Date.now() / 1000);
      const all = store.getByTimeRange(now - 10, now + 10);
      expect(all).toHaveLength(3);
    });

    it('getByTimeRange returns empty for out-of-range', () => {
      const all = store.getByTimeRange(0, 1);
      expect(all).toHaveLength(0);
    });

    it('getTraumatic returns events with severity >= 7', () => {
      const traumatic = store.getTraumatic();
      expect(traumatic).toHaveLength(1);
      expect(traumatic[0]?.type).toBe('terminated');
    });

    it('getByFilter filters by type', () => {
      const result = store.getByFilter({ types: ['fed', 'petted'] });
      expect(result).toHaveLength(2);
    });

    it('getByFilter filters by severity range', () => {
      const result = store.getByFilter({ minSeverity: 5 });
      expect(result).toHaveLength(1);
    });
  });

  // ── Decay ────────────────────────────────────────────────
  describe('decay', () => {
    it('applyDecay reduces decay coefficients', () => {
      // Create an event with a past timestamp
      const pastTime = Math.floor(Date.now() / 1000) - 86400; // 1 day ago
      const event = store.record({ type: 'petted', severity: 2, context: { emotion: 'happy', affection: 50, morality: 50, hunger: 30, fatigue: 20, trauma: 0 } });
      // Manually set timestamp to past
      (store as any).events = store.getAll().map((e) => ({ ...e, timestamp: pastTime }));

      store.applyDecay();
      const events = store.getAll();
      expect(events[0]?.decay).toBeLessThan(1.0);
    });

    it('getEffectiveWeight returns severity * decay', () => {
      const event: MemoryEvent = {
        id: 'test',
        type: 'fed',
        timestamp: Math.floor(Date.now() / 1000),
        severity: 5,
        context: { emotion: 'happy', affection: 50, morality: 50, hunger: 30, fatigue: 20, trauma: 0 },
        decay: 0.5,
      };
      expect(store.getEffectiveWeight(event)).toBe(2.5);
    });
  });

  // ── Persistence ──────────────────────────────────────────
  describe('persistence', () => {
    it('saves and loads events', () => {
      store.record({ type: 'fed', severity: 3, context: { emotion: 'happy', affection: 50, morality: 50, hunger: 30, fatigue: 20, trauma: 0 } });
      store.record({ type: 'petted', severity: 2, context: { emotion: 'happy', affection: 50, morality: 50, hunger: 30, fatigue: 20, trauma: 0 } });
      store.save();

      const newStore = new MemoryStore(dataDir);
      newStore.load();
      expect(newStore.getEventCount()).toBe(2);
    });

    it('loads empty array when no file exists', () => {
      const newStore = new MemoryStore(dataDir);
      newStore.load();
      expect(newStore.getEventCount()).toBe(0);
    });

    it('loads empty array on corrupted file', () => {
      const filePath = path.join(dataDir, 'memories.json');
      fs.writeFileSync(filePath, 'not valid json', 'utf-8');

      const newStore = new MemoryStore(dataDir);
      newStore.load();
      expect(newStore.getEventCount()).toBe(0);
    });
  });

  // ── Memory context ───────────────────────────────────────
  describe('getMemoryContext', () => {
    it('returns "No recent memories" when empty', () => {
      const context = store.getMemoryContext();
      expect(context).toBe('No recent memories.');
    });

    it('returns formatted context with events', () => {
      store.record({ type: 'fed', severity: 3, context: { emotion: 'happy', affection: 50, morality: 50, hunger: 30, fatigue: 20, trauma: 0 }, description: 'User fed Noah' });
      const context = store.getMemoryContext();
      expect(context).toContain('Recent memories');
      expect(context).toContain('User fed Noah');
    });
  });

  // ── Clear ────────────────────────────────────────────────
  describe('clear', () => {
    it('clears all events', () => {
      store.record({ type: 'fed', severity: 3, context: { emotion: 'happy', affection: 50, morality: 50, hunger: 30, fatigue: 20, trauma: 0 } });
      expect(store.getEventCount()).toBe(1);
      store.clear();
      expect(store.getEventCount()).toBe(0);
    });
  });
});

describe('Memory Decay Logic', () => {
  describe('classifyMemoryType', () => {
    it('classifies positive events', () => {
      expect(classifyMemoryType('fed')).toBe('positive');
      expect(classifyMemoryType('petted')).toBe('positive');
      expect(classifyMemoryType('gifted')).toBe('positive');
    });

    it('classifies negative events', () => {
      expect(classifyMemoryType('ignored')).toBe('negative');
      expect(classifyMemoryType('dragged_rough')).toBe('negative');
    });

    it('classifies traumatic events', () => {
      expect(classifyMemoryType('terminated')).toBe('traumatic');
      expect(classifyMemoryType('thrown_hard')).toBe('traumatic');
    });

    it('classifies neutral events', () => {
      expect(classifyMemoryType('returned')).toBe('neutral');
      expect(classifyMemoryType('slept')).toBe('neutral');
      expect(classifyMemoryType('spoken_to')).toBe('neutral');
    });
  });

  describe('calculateDecay', () => {
    it('reduces decay for positive events', () => {
      const result = calculateDecay(1.0, 'positive', 1); // 1 day
      expect(result).toBeLessThan(1.0);
      expect(result).toBeGreaterThanOrEqual(0.1);
    });

    it('barely reduces decay for traumatic events', () => {
      const result = calculateDecay(1.0, 'traumatic', 1); // 1 day
      expect(result).toBeCloseTo(0.999, 3);
    });

    it('does not go below floor', () => {
      const result = calculateDecay(0.15, 'positive', 100); // 100 days
      expect(result).toBe(0.1); // floor for positive
    });

    it('traumatic floor is 0.8', () => {
      const result = calculateDecay(1.0, 'traumatic', 1000); // 1000 days
      expect(result).toBe(0.8);
    });
  });

  describe('getInitialDecay', () => {
    it('returns 1.0', () => {
      expect(getInitialDecay()).toBe(1.0);
    });
  });

  describe('getDecayRate', () => {
    it('returns correct rates', () => {
      expect(getDecayRate('positive')).toBeGreaterThan(0);
      expect(getDecayRate('traumatic')).toBeLessThan(getDecayRate('negative'));
    });
  });

  describe('getDecayFloor', () => {
    it('returns correct floors', () => {
      expect(getDecayFloor('traumatic')).toBeGreaterThan(getDecayFloor('negative'));
      expect(getDecayFloor('positive')).toBe(0.1);
      expect(getDecayFloor('neutral')).toBe(0.0);
    });
  });
});
