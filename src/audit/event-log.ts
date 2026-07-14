import { appendFileSync } from "node:fs";
import type { AuditEvent, AuditEventType } from "@/shared/types";

export class EventLog {
  private seq = 0;
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  append(type: AuditEventType | string, data: Record<string, unknown>): AuditEvent {
    const event: AuditEvent = {
      seq: this.seq,
      timestamp: new Date().toISOString(),
      type: type as AuditEventType,
      data,
    };
    this.seq += 1;
    appendFileSync(this.filePath, JSON.stringify(event) + "\n", "utf-8");
    return event;
  }

  get count(): number {
    return this.seq;
  }
}
