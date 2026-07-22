'use client';

import WorkspaceSidebar from './WorkspaceSidebar';

// Wraps every tool page so the Workspace Sidebar can dock to the left of the
// existing content (which itself may still split further right for the
// Quick Guide panel — see QuickGuideTab).
//
// Deliberately renders the SAME wrapper structure unconditionally — do not
// branch on session status here. If this returned `children` directly while
// idle and only wrapped in extra <div>s once a session goes active, React
// would see the tool page's subtree move to a new position in the tree the
// instant a session activates (e.g. right after a cold upload finishes and
// startSession() resolves) and remount it, wiping whatever local state the
// tool had just built (an uploaded file, rendered canvas, etc.) — this was
// caught by Puppeteer verification, not a hypothetical. WorkspaceSidebar
// itself already renders nothing when there's no active session, so an
// idle visitor sees an unstyled wrapper div around identical content — no
// visible difference from before this component existed.
export default function WorkspaceLayoutShell({ children }) {
  return (
    <div className="md:flex md:items-start">
      <WorkspaceSidebar />
      <div className="md:flex-1 md:min-w-0">{children}</div>
    </div>
  );
}
