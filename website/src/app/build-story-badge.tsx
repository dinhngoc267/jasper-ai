// The published "Building & automating a business with Claude Code" artifact.
// NOTE: Claude artifacts are private by default — this link won't open for
// visitors until the artifact is shared (its Share menu → anyone with the link).
const ARTIFACT_URL =
  "https://claude.ai/code/artifact/b98e659f-901e-4901-9332-b71fc8554602";

/**
 * A floating action button, bottom-right, in the chat-widget idiom: collapsed
 * it's a round icon; on hover or keyboard focus it expands into a pill that
 * reveals the label. Pure CSS (no JS) — safe as a server component.
 */
export function BuildStoryBadge() {
  return (
    <a
      href={ARTIFACT_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="How this site was built with AI — open the build story"
      style={{ borderColor: "var(--rule)" }}
      className="group fixed bottom-6 right-6 z-40 flex items-center rounded-full border bg-white shadow-xl transition-shadow hover:shadow-2xl focus-visible:outline-none"
    >
      <span className="relative grid h-14 w-14 flex-none place-items-center">
        <span
          aria-hidden="true"
          className="text-2xl leading-none"
          style={{ color: "var(--blue)" }}
        >
          ✦
        </span>
        <span
          aria-hidden="true"
          className="absolute right-3.5 top-3.5 h-2 w-2 rounded-full"
          style={{ background: "var(--blue)" }}
        />
      </span>
      <span
        style={{ color: "var(--ink)" }}
        className="flex max-w-0 items-center gap-2 overflow-hidden whitespace-nowrap text-sm font-medium opacity-0 transition-all duration-300 ease-out group-hover:max-w-xs group-hover:pr-5 group-hover:opacity-100 group-focus-visible:max-w-xs group-focus-visible:pr-5 group-focus-visible:opacity-100"
      >
        How this site was built with AI
        <span style={{ color: "var(--blue)" }}>→</span>
      </span>
    </a>
  );
}
