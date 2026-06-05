import { resolveEmotion as sharedResolve } from '../../shared/utils/index.js';
import type { Emotion, NoahState } from '../../shared/types/index.js';

/**
 * Main-process emotion resolver.
 * Wraps the shared pure resolver with main-process-specific logic
 * (e.g., recent events override, cooldown checks).
 */
export function resolveEmotion(state: NoahState): Emotion {
  // Shared heuristics: trauma > 80 → traumatized, trauma > 50 → scared,
  // hunger > 80 → hungry, fatigue > 80 → tired, affection-based mood
  const base = sharedResolve(state);

  // Main-process overrides (future: memory-influence, LLM output, etc.)
  // For Stage 6, just pass through
  return base;
}