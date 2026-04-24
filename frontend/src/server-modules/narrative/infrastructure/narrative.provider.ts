import type { NarrativeInput } from "../domain/narrative.types";

export interface NarrativeProvider {
  generate(input: NarrativeInput): Promise<string>;
}
