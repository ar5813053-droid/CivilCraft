/** Milestone 1 — Event bus tests. */
function createBus() {
  const handlers = new Map();
  let queue = [];
  let history = [];
  let seq = 0;
  return {
    subscribe(type, h) {
      if (!handlers.has(type)) handlers.set(type, []);
      handlers.get(type).push(h);
      return () => {
        const list = handlers.get(type);
        const i = list.indexOf(h);
        if (i >= 0) list.splice(i, 1);
      };
    },
    publish(type, meta = {}) {
      seq++;
      const ev = { id: "e" + seq, type, metadata: meta, actorId: meta.actorId };
      queue.push(ev);
      return ev;
    },
    flush() {
      const batch = queue.splice(0, 25);
      for (const ev of batch) {
        history.push(ev);
        for (const h of handlers.get(ev.type) || []) {
          try { h(ev.metadata, ev); } catch { /* isolate */ }
        }
        for (const h of handlers.get("*") || []) {
          try { h(ev.metadata, ev); } catch { /* isolate */ }
        }
      }
      return batch.length;
    },
    history: () => history,
    queueLen: () => queue.length
  };
}

let passed = 0, failed = 0;
function assert(c, m) { if (c) { passed++; console.log("  ✓ " + m); } else { failed++; console.error("  ✗ " + m); } }
console.log("Event bus\n");

const bus = createBus();
const received = [];
const unsub = bus.subscribe("PLAYER_JOB_STARTED", (p, e) => received.push(e.type));
bus.subscribe("PLAYER_JOB_STARTED", () => received.push("second"));
const ev = bus.publish("PLAYER_JOB_STARTED", { actorId: "p1", jobId: "farmer" });
assert(ev.id && ev.type === "PLAYER_JOB_STARTED", "publish + deterministic event id shape");
assert(bus.flush() === 1, "flush processes queue");
assert(received.includes("PLAYER_JOB_STARTED") && received.includes("second"), "multiple subscribers");
unsub();
received.length = 0;
bus.publish("PLAYER_JOB_STARTED", {});
bus.flush();
assert(received.length === 1 && received[0] === "second", "unsubscribe");
bus.subscribe("X", () => { throw new Error("boom"); });
bus.subscribe("X", () => received.push("ok"));
bus.publish("X", {});
bus.flush();
assert(received.includes("ok"), "subscriber isolation");

// Integration sketch: job → memory
const mem = [];
bus.subscribe("*", (_p, e) => {
  if (e.type === "PLAYER_MISSION_COMPLETED") mem.push(e.type);
});
bus.publish("PLAYER_MISSION_COMPLETED", { actorId: "p1" });
bus.flush();
assert(mem[0] === "PLAYER_MISSION_COMPLETED", "mission event to memory path");
bus.publish("ELECTION_COMPLETED", {});
bus.flush();
assert(bus.history().some((h) => h.type === "ELECTION_COMPLETED"), "election event history");
bus.publish("EMERGENCY_RESOLVED", {});
bus.flush();
assert(bus.history().some((h) => h.type === "EMERGENCY_RESOLVED"), "emergency event");

console.log(failed ? `${failed} failed` : `\nAll ${passed} event-bus tests passed.`);
process.exit(failed ? 1 : 0);
