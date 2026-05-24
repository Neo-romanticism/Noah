/**
 * MemoryStore — Noah's structured event memory system.
 *
 * Records interactions as MemoryEvents with metadata,
 * supports retrieval by type/time/severity, implements
 * decay logic, and persists to disk atomically.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

import type { MemoryEvent, MemoryEventType, MemoryFilter } from '../../shared/types/index.js';
import { MEMORY_FILENAME, MEMORY_MAX_EVENTS } from '../../shared/constants/index.js';
import { classifyMemoryType, calculateDecay, getInitialDecay } from './decay.js';

export class MemoryStore {
  private events: MemoryEvent[] = [];
  private readonly filePath: string;

  constructor(dataDir: string) {
    this.filePath = path.join(dataDir, MEMORY_FILENAME);
  }

  // ── Event recording ──────────────────────────────────────

  /**
   * Record a new memory event.
   * Automatically generates id, timestamp, and initial decay.
   */
  public record(
    event: Omit<MemoryEvent, 'id' | 'timestamp' | 'decay'>,
  ): MemoryEvent {
    const newEvent: MemoryEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: Math.floor(Date.now() / 1000),
      decay: getInitialDecay(),
    };

    this.events.push(newEvent);

    // Prune if over max capacity
    if (this.events.length > MEMORY_MAX_EVENTS) {
      this.events = this.events.slice(-MEMORY_MAX_EVENTS);
    }

    return newEvent;
  }

  // ── Retrieval ────────────────────────────────────────────

  /** Get all stored events. */
  public getAll(): MemoryEvent[] {
    return [...this.events];
  }

  /** Get the most recent N events. */
  public getRecent(count: number): MemoryEvent[] {
    return this.events.slice(-count).reverse();
  }

  /** Get events of a specific type. */
  public getByType(type: MemoryEventType): MemoryEvent[] {
    return this.events.filter((e) => e.type === type);
  }

  /** Get events within a time range (inclusive, Unix seconds). */
  public getByTimeRange(start: number, end: number): MemoryEvent[] {
    return this.events.filter((e) => e.timestamp >= start && e.timestamp <= end);
  }

  /** Get events matching a filter. */
  public getByFilter(filter: MemoryFilter): MemoryEvent[] {
    return this.events.filter((e) => {
      if (filter.types && !filter.types.includes(e.type)) return false;
      if (filter.startTime !== undefined && e.timestamp < filter.startTime) return false;
      if (filter.endTime !== undefined && e.timestamp > filter.endTime) return false;
      if (filter.minSeverity !== undefined && e.severity < filter.minSeverity) return false;
      if (filter.maxSeverity !== undefined && e.severity > filter.maxSeverity) return false;
      return true;
    });
  }

  /** Get traumatic events (severity >= 7). */
  public getTraumatic(): MemoryEvent[] {
    return this.events.filter((e) => e.severity >= 7);
  }

  // ── Decay ────────────────────────────────────────────────

  /**
   * Apply decay to all events based on their age.
   * Should be called periodically (e.g., on load, on save).
   */
  public applyDecay(): void {
    const now = Math.floor(Date.now() / 1000);

    this.events = this.events.map((event) => {
      const ageSeconds = now - event.timestamp;
      const ageDays = ageSeconds / 86400;
      const category = classifyMemoryType(event.type);
      const newDecay = calculateDecay(event.decay, category, ageDays);

      return { ...event, decay: newDecay };
    });
  }

  /**
   * Get the effective weight of an event (severity * decay).
   * Used for determining how much an event influences Noah's state.
   */
  public getEffectiveWeight(event: MemoryEvent): number {
    return event.severity * event.decay;
  }

  // ── Memory context for LLM ───────────────────────────────

  /**
   * Build a natural-language summary of recent memories for LLM input.
   */
  public getMemoryContext(options?: {
    maxEvents?: number;
    timeWindowMs?: number;
  }): string {
    const maxEvents = options?.maxEvents ?? 10;
    const timeWindowMs = options?.timeWindowMs ?? 86_400_000; // 24 hours

    const cutoff = Date.now() - timeWindowMs;
    const cutoffSeconds = Math.floor(cutoff / 1000);

    const recent = this.events
      .filter((e) => e.timestamp >= cutoffSeconds)
      .slice(-maxEvents)
      .reverse();

    if (recent.length === 0) return 'No recent memories.';

    const lines = recent.map((e) => {
      const date = new Date(e.timestamp * 1000);
      const timeStr = date.toLocaleTimeString();
      const desc = e.description ?? e.type;
      return `- [${timeStr}] ${desc} (severity: ${e.severity}, weight: ${this.getEffectiveWeight(e).toFixed(2)})`;
    });

    return `Recent memories (${recent.length}):\n${lines.join('\n')}`;
  }

  // ── Persistence ──────────────────────────────────────────

  /** Save events to disk atomically. */
  public save(): void {
    const tmp = `${this.filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.events, null, 2), 'utf-8');
    fs.renameSync(tmp, this.filePath);
  }

  /** Load events from disk. */
  public load(): void {
    try {
      if (!fs.existsSync(this.filePath)) {
        this.events = [];
        return;
      }
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw) as MemoryEvent[];
      this.events = Array.isArray(parsed) ? parsed : [];
    } catch {
      this.events = [];
    }
  }

  /** Get the current event count. */
  public getEventCount(): number {
    return this.events.length;
  }

  /** Clear all events (for testing). */
  public clear(): void {
    this.events = [];
  }
}
