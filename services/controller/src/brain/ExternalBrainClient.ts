import { brainDecisionSchema, type BrainDecision } from "./schema.js";

export interface ExternalBrainRequest {
  task: {
    id: string;
    title: string;
    goal: string;
    priority: number;
    author: string;
  };
  snapshot: unknown;
  brain: {
    id: string;
    endpoint: string;
    model?: string | undefined;
  };
}

export class ExternalBrainClient {
  constructor(
    private readonly endpoint: string,
    private readonly token?: string | undefined,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async decide(request: ExternalBrainRequest): Promise<BrainDecision> {
    const response = await this.fetchImpl(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`External brain returned ${response.status}`);
    }

    const body: unknown = await response.json();
    return brainDecisionSchema.parse(body);
  }
}
