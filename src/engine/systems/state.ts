import type { System } from "./cooking";

export const stateSystem: System = {
  id: "state",
  step(state) {
    const entities = { ...state.entities };
    let changed = false;
    for (const [id, e] of Object.entries(state.entities)) {
      const { cookable, stateful } = e.components;
      if (!cookable || !stateful || stateful.current === cookable.state) continue;
      entities[id] = { ...e, components: { ...e.components, stateful: { ...stateful, current: cookable.state } } };
      changed = true;
    }
    return changed ? { ...state, entities } : state;
  },
};
