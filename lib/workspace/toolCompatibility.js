// Which tool slugs currently participate in the live Document Session (pull
// on load, push on completion). Expanded tool-by-tool as each one is wired
// into the pull/push pattern — see the architecture plan's delivery order.
// Everything not listed here still works exactly as it does today; it just
// doesn't yet read from or write to an active session.
export const SESSION_COMPATIBLE_TOOLS = ['redact-pdf', 'sign-pdf'];

export function isSessionCompatibleTool(slug) {
  return SESSION_COMPATIBLE_TOOLS.includes(slug);
}
