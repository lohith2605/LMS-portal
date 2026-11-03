# LearnSpace LMS — Implement a Responsive Collapsible Sidebar

Project: LearnSpace LMS  
Repository: https://github.com/lohith2605/LMS-portal

## 1. Objective

Implement a polished, responsive, collapsible sidebar across the existing LearnSpace LMS dashboards.

The goal is to give users more screen space for dashboard content while keeping navigation easy to access through a hamburger menu.

The sidebar should support:

- Expanded mode with icons and navigation labels.
- Collapsed mode showing only navigation icons.
- A hamburger button to toggle the sidebar.
- A mobile drawer that opens and closes smoothly.
- Correct behavior across student, instructor, and admin dashboards.

IMPORTANT: Inspect the existing project architecture, dashboard layouts, routing, theme system, and navigation components before making changes. Reuse the existing components and styling conventions wherever possible.

Do not create a separate sidebar implementation for every page if the application already has shared dashboard layouts.

## 2. Inspect the existing application

Before editing, identify:

- The frontend framework and styling setup.
- Existing student, instructor, and admin dashboard layouts.
- Existing sidebar and navigation components.
- Existing hamburger buttons or mobile navigation.
- The current header/top navigation structure.
- Route definitions and active-route handling.
- Role-based navigation items and permissions.
- The existing Cobalt Blue + Cloud White theme implementation, if already applied.
- Existing light/dark theme support.
- Current responsive breakpoints.
- Existing icon library, such as Lucide React.
- Any existing sidebar collapse state or persistence mechanism.

Inspect the working tree before modifying files. Preserve unrelated changes and avoid duplicating functionality that already exists.

## 3. Desktop sidebar behavior

At desktop widths, provide two sidebar states.

### Expanded state

- Display the sidebar at its normal width, approximately 240–260px, adjusted to fit the existing design.
- Show the LearnSpace brand or appropriate dashboard identity.
- Display each navigation item's icon and text label.
- Highlight the active route using the existing Cobalt Blue theme.
- Keep navigation groups, separators, and section labels readable.
- Maintain existing navigation order and role-specific menu items.
- Include a clear collapse control near the top of the sidebar or in the dashboard header.

### Collapsed state

- Reduce the sidebar width to approximately 68–80px.
- Show navigation icons only.
- Hide text labels without removing the navigation items or their functionality.
- Center icons consistently.
- Preserve the active-route indicator.
- Keep the logo recognizable, using a compact mark if one already exists.
- Display tooltips with navigation labels when users hover over icons.
- Provide accessible labels for icon-only controls.
- Do not allow icons to overlap, shift unpredictably, or become difficult to click.

### Toggle behavior

- Add a hamburger/sidebar toggle button in a consistent, easily accessible location.
- Clicking the button should switch between expanded and collapsed desktop states.
- Use a smooth width transition, approximately 200–300ms.
- Avoid animating every navigation element independently.
- Respect reduced-motion preferences.
- Keep the main content layout synchronized with the sidebar width.

When the sidebar collapses, the dashboard content should expand into the available space rather than leaving a blank column.

When it expands, the dashboard content should resize correctly without horizontal overflow or broken card layouts.

## 4. Mobile and tablet behavior

Do not simply shrink the desktop sidebar on mobile.

At mobile widths, use a slide-in navigation drawer.

Requirements:

- The sidebar should be hidden off-screen by default.
- The hamburger button should open the drawer.
- Add a subtle backdrop behind the drawer.
- Tapping the backdrop should close the drawer.
- Pressing Escape should close the drawer.
- Selecting a navigation item should navigate normally and close the drawer.
- Prevent accidental horizontal scrolling while the drawer is open.
- Keep the main page usable when the drawer is closed.
- Make drawer controls touch-friendly.
- Ensure the drawer fits within the viewport height and handles long navigation menus with scrolling.

Use an appropriate responsive breakpoint based on the existing application, typically around 768px.

On mobile, the drawer should overlay the content rather than permanently reduce the dashboard's width.

On tablet widths, choose the behavior that best fits the existing layout and available space.

## 5. Apply it consistently to all roles

Implement the sidebar through the shared dashboard layout wherever possible.

### Student dashboard

Preserve all existing student navigation items, including the relevant pages for:

- Dashboard overview.
- Courses and enrollments.
- Learning progress.
- Assignments.
- Quizzes and assessments.
- Grades and certificates.
- Notifications.
- Profile and settings.

Use the actual navigation items present in the project. Do not invent new routes.

### Instructor dashboard

Preserve the existing instructor navigation, including relevant pages for:

- Dashboard overview.
- Course management.
- Curriculum and lessons.
- Assignments and grading.
- Student management.
- Reviews and ratings.
- Analytics.
- Notifications.
- Profile and settings.

Only include items that already exist in the application.

### Admin dashboard

Preserve the existing administrative navigation, including relevant pages for:

- Dashboard overview.
- User management.
- Instructor approvals.
- Course management or moderation.
- Reports and analytics.
- Notifications.
- Settings.

Maintain the current admin-only route protection and permissions.

IMPORTANT: Do not accidentally show instructor-only or admin-only navigation to unauthorized users. Keep the existing role-based navigation logic and backend authorization unchanged.

## 6. Dashboard header integration

Inspect the current dashboard header before placing the hamburger control.

- Use a single consistent toggle button across dashboard layouts.
- Avoid displaying duplicate hamburger buttons.
- Keep the page title, breadcrumbs, notifications, theme toggle, profile menu, and logout controls working.
- Ensure the hamburger button remains visible in both expanded and collapsed states.
- Maintain proper spacing between the header and sidebar.
- Do not redesign the entire header unnecessarily.

If the project has separate dashboard layouts, integrate the behavior into each existing layout using shared logic or a reusable component where practical.

## 7. Theme and styling

Use the existing LearnSpace Cobalt Blue + Cloud White design system if it has already been implemented.

Suggested styling:

- Sidebar background: `#FFFFFF`
- Main dashboard background: `#F7F9FC`
- Primary accent: `#2457C5`
- Active navigation background: `#EAF1FF`
- Active navigation text and icon: `#2457C5`
- Primary text: `#172033`
- Secondary text: `#596579`
- Sidebar border: `#E1E7EF`
- Hover background: `#F1F4F8`

Treat these as defaults and reuse existing shared theme tokens if available.

Requirements:

- Match existing card borders, radii, typography, and spacing.
- Use consistent icon sizes, ideally around 18–20px.
- Keep inactive navigation visually restrained.
- Use a clear active-route indicator.
- Avoid excessive shadows, gradients, and saturated backgrounds.
- Preserve dark-mode behavior if it exists.
- Do not introduce a competing theme system.

## 8. State management and persistence

Implement sidebar state cleanly.

Desktop:

- Allow the user to collapse and expand the sidebar.
- If appropriate, persist the desktop preference using the project's existing preference mechanism.
- Restore the preference on reload only if persistence is consistent with the current application architecture.

Mobile:

- The drawer should normally start closed.
- Do not persist the mobile drawer as open across reloads.
- Close the drawer after navigation and when switching to a desktop viewport.

Avoid:

- Duplicated state between nested layouts.
- Repeated event listeners.
- Memory leaks.
- Direct DOM manipulation when React state is sufficient.
- Unnecessary global state libraries.
- Flashing or major layout shifts during initialization.

If local storage is used for desktop preference, store only the minimal UI preference and handle storage errors gracefully.

## 9. Accessibility

Ensure:

- The toggle is a real button.
- The button has an accessible name, such as "Collapse sidebar" or "Expand sidebar".
- `aria-expanded` accurately reflects the state.
- `aria-controls` references the correct sidebar or drawer.
- Icon-only navigation links have accessible labels.
- Keyboard focus remains visible.
- The mobile drawer supports Escape-to-close.
- Focus behavior is appropriate when the drawer opens and closes.
- The backdrop is not exposed as a misleading navigation control.
- Color contrast remains sufficient in light and dark themes.
- Reduced-motion preferences are respected.

Do not use clickable generic containers when semantic buttons or links are appropriate.

## 10. Layout and performance

- Ensure the main dashboard content uses the available width after sidebar toggling.
- Prevent charts, tables, course grids, and cards from overflowing.
- Ensure sticky headers and scrollable sidebars continue working.
- Avoid unnecessary rerenders across unrelated application components.
- Avoid adding new dependencies unless the current stack cannot reasonably support the feature.
- Reuse the project's existing icon library.
- Keep CSS transitions performant.
- Do not change existing API calls, database models, authentication, or business logic.

## 11. Testing checklist

Use the existing project test framework and available scripts.

Verify:

1. The sidebar expands and collapses correctly on desktop.
2. Icons remain visible and aligned in collapsed mode.
3. Tooltips display the correct navigation labels.
4. The active route remains highlighted.
5. Main content resizes correctly without excessive empty space.
6. All existing navigation links still work.
7. Student, instructor, and admin menus remain role-specific.
8. The mobile hamburger opens the drawer.
9. Backdrop click and Escape close the drawer.
10. Selecting a mobile navigation item closes the drawer.
11. Switching between mobile and desktop widths does not leave the sidebar stuck open.
12. Reloading restores the desktop preference if persistence was implemented.
13. The theme toggle continues working.
14. Long navigation menus remain scrollable.
15. Tables, charts, forms, and course grids remain usable at different widths.
16. No new console errors, React warnings, or broken routes are introduced.

Run the existing frontend lint checks and production build. Run relevant tests if the project already has them.

Do not claim that browser testing or visual verification was performed unless it was actually performed.

## 12. Git safety and scope

Mandatory constraints:

- Do not commit or push.
- Do not reset, revert, or run destructive Git commands.
- Do not discard or overwrite unrelated local changes.
- Do not change backend functionality unnecessarily.
- Do not remove or rename existing routes.
- Do not change role permissions.
- Do not replace the existing frontend architecture.
- Do not create duplicate dashboard layouts without a clear reason.

Keep the implementation focused on sidebar navigation, responsive layout behavior, and the necessary shared styling.

## 13. Final report

After implementation, report:

- The existing sidebar and layout architecture discovered.
- Which shared components were reused or created.
- Which dashboards now support collapsing.
- How mobile drawer behavior works.
- Whether desktop state persistence was implemented.
- Files changed.
- Tests, lint checks, and builds actually executed.
- Any remaining issues requiring manual verification.

Start by inspecting the current implementation. Then implement and validate the collapsible sidebar across all applicable LearnSpace dashboards while preserving existing functionality.
