import { StateManager } from '../../src/main/state/index.js';
import type { InteractionEvent, MemoryEvent, NoahState } from '../../src/shared/types/index.js';

describe('StateManager', () => {
  // ── Initialization ───────────────────────────────────────
  describe('initialization', () => {
    it('creates a default state when no initial state is provided', () => {
      const sm = new StateManager();
      const state = sm.getState();

      expect(state.emotion).toBe('happy');
      expect(state.affection).toBe(50);
      expect(state.version).toBe(1);
      expect(state.isSleeping).toBe(false);
      expect(state.discomfortCount).toBe(0);
    });

    it('uses the provided initial state', () => {
      const initial: NoahState = {
        emotion: 'sad',
        affection: 10,
        morality: 50,
        hunger: 80,
        fatigue: 50,
        trauma: 0,
        level: 1,
        xp: 0,
        lastSeen: Date.now(),
        sessionStart: Date.now(),
        totalOnlineTime: 0,
        totalOfflineTime: 0,
        isSleeping: false,
        discomfortCount: 0,
        systemLoad: 0,
        systemWeather: 'sunny',
        version: 1,
      };
      const sm = new StateManager(initial);
      expect(sm.getState().emotion).toBe('sad');
      expect(sm.getState().affection).toBe(10);
    });
  });

  // ── State changes ────────────────────────────────────────
  describe('state changes', () => {
    it('emits state change events', () => {
      const sm = new StateManager();
      const listener = jest.fn();
      sm.onStateChange(listener);

      sm.modify((draft) => ({ ...draft, affection: 60 }));
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('unsubscribes listeners correctly', () => {
      const sm = new StateManager();
      const listener = jest.fn();
      const unsubscribe = sm.onStateChange(listener);
      unsubscribe();

      sm.modify((draft) => ({ ...draft, affection: 60 }));
      expect(listener).not.toHaveBeenCalled();
    });
  });

  // ── applyInteraction ─────────────────────────────────────
  describe('applyInteraction', () => {
    it('updates lastSeen on interaction', () => {
      const sm = new StateManager();
      const before = sm.getState().lastSeen;

      const event: InteractionEvent = { type: 'pet', timestamp: Date.now() };
      sm.applyInteraction(event);

      expect(sm.getState().lastSeen).toBeGreaterThanOrEqual(before);
    });

    it('records memory event when memory store is wired', () => {
      const sm = new StateManager();
      const recorded: Array<Omit<MemoryEvent, 'id' | 'timestamp' | 'decay'>> = [];

      const mockStore = {
        record: (event: Omit<MemoryEvent, 'id' | 'timestamp' | 'decay'>) => {
          recorded.push(event);
          return { ...event, id: 'test-id', timestamp: Date.now(), decay: 1.0 };
        },
      };

      sm.setMemoryStore(mockStore);

      const event: InteractionEvent = { type: 'feed', timestamp: Date.now() };
      sm.applyInteraction(event);

      expect(recorded).toHaveLength(1);
      expect(recorded[0]?.type).toBe('fed');
      expect(recorded[0]?.severity).toBe(3);
    });

    it('does not record memory event when no memory store', () => {
      const sm = new StateManager();
      const event: InteractionEvent = { type: 'pet', timestamp: Date.now() };
      expect(() => sm.applyInteraction(event)).not.toThrow();
    });
  });

  // ── reconcileAbsence ─────────────────────────────────────
  describe('reconcileAbsence', () => {
    it('increases hunger during absence', () => {
      const sm = new StateManager();
      const before = sm.getState().hunger;

      sm.reconcileAbsence(3600); // 1 hour
      expect(sm.getState().hunger).toBeGreaterThan(before);
    });

    it('updates totalOfflineTime', () => {
      const sm = new StateManager();
      sm.reconcileAbsence(3600);
      expect(sm.getState().totalOfflineTime).toBe(3600);
    });

    it('accumulates totalOfflineTime across multiple reconciliations', () => {
      const sm = new StateManager();
      sm.reconcileAbsence(3600);
      sm.reconcileAbsence(1800);
      expect(sm.getState().totalOfflineTime).toBe(5400);
    });

    it('emits state change on reconciliation', () => {
      const sm = new StateManager();
      const listener = jest.fn();
      sm.onStateChange(listener);

      sm.reconcileAbsence(3600);
      expect(listener).toHaveBeenCalled();
    });
  });

  // ── recordEvent ──────────────────────────────────────────
  describe('recordEvent', () => {
    it('records event when memory store is wired', () => {
      const sm = new StateManager();
      const mockStore = {
        record: jest.fn().mockReturnValue({ id: 'test-id', timestamp: Date.now(), decay: 1.0 }),
      };
      sm.setMemoryStore(mockStore);

      const result = sm.recordEvent({
        type: 'leveled_up',
        severity: 3,
        context: {
          emotion: 'happy',
          affection: 50,
          morality: 50,
          hunger: 30,
          fatigue: 20,
          trauma: 0,
        },
        description: 'Leveled up!',
      });

      expect(result).not.toBeNull();
      expect(mockStore.record).toHaveBeenCalledTimes(1);
    });

    it('returns null when no memory store', () => {
      const sm = new StateManager();
      const result = sm.recordEvent({
        type: 'leveled_up',
        severity: 3,
        context: {
          emotion: 'happy',
          affection: 50,
          morality: 50,
          hunger: 30,
          fatigue: 20,
          trauma: 0,
        },
      });
      expect(result).toBeNull();
    });
  });

  // ── tick ─────────────────────────────────────────────────
  describe('tick', () => {
    it('updates lastSeen', () => {
      const sm = new StateManager();
      const now = Date.now() + 1000;
      sm.tick(now);
      expect(sm.getState().lastSeen).toBe(now);
    });

    it('accumulates totalOnlineTime across multiple ticks', () => {
      const sm = new StateManager();
      const start = 1_000_000;
      sm.tick(start); // first tick sets lastSeen, no elapsed time
      expect(sm.getState().totalOnlineTime).toBe(0);

      sm.tick(start + 5_000); // 5 seconds later
      expect(sm.getState().totalOnlineTime).toBe(5);

      sm.tick(start + 8_000); // 3 more seconds
      expect(sm.getState().totalOnlineTime).toBe(8);
    });

    it('does not go negative when now is before lastSeen', () => {
      const sm = new StateManager();
      sm.tick(1000);
      sm.tick(500); // earlier than previous tick
      expect(sm.getState().totalOnlineTime).toBe(0);
    });
  });

  // ── modify ───────────────────────────────────────────────
  describe('modify', () => {
    it('applies a mutation and emits state change', () => {
      const sm = new StateManager();
      const listener = jest.fn();
      sm.onStateChange(listener);

      sm.modify((draft) => ({ ...draft, affection: 80, hunger: 50 }));
      expect(sm.getState().affection).toBe(80);
      expect(sm.getState().hunger).toBe(50);
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  // ── setFromExternal ──────────────────────────────────────
  describe('setFromExternal', () => {
    it('replaces the entire state', () => {
      const sm = new StateManager();
      const newState: NoahState = {
        ...sm.getState(),
        affection: 90,
        hunger: 10,
      };
      sm.setFromExternal(newState);
      expect(sm.getState().affection).toBe(90);
      expect(sm.getState().hunger).toBe(10);
    });
  });
});
