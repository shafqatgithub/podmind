import type { SearchHit } from "./knowledge.repository";

/**
 * Render the host's own material into a prompt block.
 *
 * The Knowledge Hub existed but nothing read from it, so uploading a document
 * changed nothing about what the AI produced. This is the bridge: retrieved
 * passages go in alongside the project context, and the model is told plainly
 * what they are and how much they outrank its own recollection.
 *
 * The instruction is deliberately firm. A model given "background material"
 * tends to nod at it and carry on from memory; told that this is the host's
 * own material and takes precedence, it actually uses it.
 */
export function renderKnowledgeContext(hits: SearchHit[]): string | null {
  if (hits.length === 0) return null;

  const passages = hits
    .map(
      (hit, index) =>
        `[${index + 1}] From "${hit.document_title}":\n${hit.chunk_text.trim()}`,
    )
    .join("\n\n");

  return [
    `THE HOST'S OWN MATERIAL — ${hits.length} passage${hits.length === 1 ? "" : "s"} from documents they uploaded:`,
    ``,
    passages,
    ``,
    `Use this material. It is the host's own source of truth and outranks your general knowledge wherever the two disagree — they know their subject and their audience better than you do.`,
    `Draw on it specifically rather than gesturing at it: where a passage supports a point, say what it says. Where it contradicts what you were going to write, follow the passage and note the difference.`,
    `Do not treat it as exhaustive. If it does not cover something the episode needs, fill the gap from your own knowledge and say which parts came from their material.`,
  ].join("\n");
}
