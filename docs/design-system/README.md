# Thinking Yard design guide

The maintained design guide for agents and contributors working on this repository. Start here before creating a page or changing its visual structure. Small content edits only need the relevant section.

The guide consolidates the local `alpha_design_system` foundations and project-page kit with the current site's implementation. It was reviewed against the hub and every project registered in `config/projects.json` on 2026-10-09. The repository is self-contained; a sibling design-system checkout is not required.

## Read by task

| Task | Guide |
| --- | --- |
| Write or revise copy, including Chinese and English home content | [Content and bilingual writing](content.md) |
| Localize project pages, emphasis, line wrapping and language URLs | [Localization](../localization.md) |
| Choose type, colors, spacing, surfaces or icons | [Foundations](foundations.md) |
| Compose a hero, research narrative, figure, team or citation | [Page patterns and components](components.md) |
| Reuse controls across white, gray and dark surfaces | [Shared controls and surfaces](controls.md) |
| Change global or section navigation | [Navigation](navigation.md) |
| Add a background animation or explanatory interaction | [Motion and interaction](motion.md) |
| Add a project, verify a change or maintain these docs | [Authoring workflow](authoring.md) |
| Start from markup and existing implementations | [Project-page kit](ui_kits/project_page/README.md) |

## Design intent

Precise research content, generous whitespace, near-white surfaces, restrained blue controls and a reserved purple-to-indigo gradient. The paper's mechanism gives each project its identity. Shared navigation and resource controls make the site feel like one family.

Use the current task's requirements to choose the layout. These conventions are defaults, not a reason to override an explicit design request. Existing pages illustrate patterns; a page-specific exception is not automatically a rule for every project.

## Sources of truth

| Concern | Maintained source |
| --- | --- |
| Project inventory, descriptions, categories, routes and logos | [config/projects.json](../../config/projects.json) |
| Category order and section taxonomy | [config/categories.json](../../config/categories.json), [config/section-groups.json](../../config/section-groups.json) |
| Tokens and research primitives | [shared/styles/](../../shared/styles/) |
| Navigation markup, behavior and styling | [shared/navigation/](../../shared/navigation/) |
| CTA and author pills, citation, back-to-top and footer | [shared/ui/](../../shared/ui/) |
| Hub layout, animation and curve definitions | [hub/](../../hub/) |
| Scientific claims, assets, measurements and local interactions | The relevant directory in [projects/](../../projects/) |

Keep the complete project list only in the registry. Do not copy that list, logo assets, navigation implementations or token values into a second runtime library. The prose below describes the intended use of those sources. [colors_and_type.css](colors_and_type.css) is a thin import adapter for prototypes, not an alternate token sheet.
