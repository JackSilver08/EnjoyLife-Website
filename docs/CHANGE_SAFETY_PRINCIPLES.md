# Enjoy Life — Safe Change Principles

**Standing requirement:** Changes to UI/UX must never corrupt user data, disrupt operational workflows, or silently regress stable functionality.

1. **Preserve data:** No destructive SQL, volume deletion, forced resets, blind seed replacements or unreviewed migrations. Back up data before any future schema/storage changes.
2. **Preserve business behavior:** Treat checkout, payOS creation/verification/webhooks, inventory reservations, returns, admin permissions, chatbot and customer account workflows as protected paths. Presentation changes must not modify their APIs, data models or contract behavior.
3. **Keep changes scoped:** Home-only enhancements belong in homepage components and CSS selectors. Prefer read-only API data; do not invent products, prices, inventory quantities or statuses.
4. **Progressive enhancement:** Content and critical links must render without client-side animation. Respect `prefers-reduced-motion`, mobile/touch use, keyboard accessibility and semantic markup.
5. **Performance:** Avoid animation libraries unless justified; prefer compositor-friendly transforms, avoid synchronous layout thrashing, and check responsive overflow and Core Web Vitals.
6. **Release gate:** Use a feature branch first; review changed-file scope, run lint/typecheck/build, existing Go/Docker/business-flow CI, and relevant browser regressions before merging `main`. If tests fail, fix or defer instead of merging.
7. **Deploy verification:** A merged commit is not proof that Render is healthy. Confirm deployed commit, startup health, real customer flow, and cloud storage separately. Maintain an easy rollback path.

This document is a rule for future Enjoy Life modifications, not an approval to change unrelated modules.
