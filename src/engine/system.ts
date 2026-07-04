import type { EngineState, Input } from "./types.js";

/** A simulation system: pure state → state per tick. The engine runs an
 *  ordered list of these — domains plug their own packs into createEngine. */
export interface System {
  id: string;
  step(state: EngineState, dtMs: number, inputs: Input[]): EngineState;
}
