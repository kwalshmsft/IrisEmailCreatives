# Iris Documentation Migration Plan

## Goal
Consolidate all Iris documentation onto **OSGWiki** (www.osgwiki.com) as the single canonical source.

---

## Inventory of Sources

### Source 1: eng.ms/iris-wiki (Freshest)
**URL:** https://eng.ms/docs/experiences-devices/dpg-services/data-platform-services/ideas-services/ideas/iris-wiki

Pages (~8):
- Home / Welcome to the Iris Wiki
- Iris Overview
- Iris Step-by-Step Guide
- Iris Targeting
- Iris Analytics & Measurement
- Iris Experimentation
- Iris Governance
- Partner Team Resources
- Engineering Resources
- Help

### Source 2: SharePoint - MicrosoftIDEAs (Moderate)
**URL:** https://microsoft.sharepoint.com/teams/MicrosoftIDEAs/SitePages/Iris-Overview.aspx

Pages (1 main page):
- Iris Overview (general landing page: what Iris is, campaign types, key capabilities, core concepts)

### Source 3: eng.ms/ideas-wiki (Staler)
**URL:** https://eng.ms/docs/experiences-devices/data-platform-growth/ideas/ideas-wiki/services/pgs-auto-segmentation

Pages (~7):
- Home
- Getting Access
- Reporting
- Data Platform
- Privacy & Compliance
- Products & Services (includes PGS Auto-Segmentation)
- IDEAS Copilot
- Help

### Source 4: OSGWiki - Category:Iris (Stalest)
**URL:** https://www.osgwiki.com/wiki/Category:Iris

Known pages (from earlier crawl):
- ARC API
- Booking Editorial Content Blocks
- Campaign Memory / Campaign Memory V2 / Campaign Memory Deprecated
- CDM / CDMLite
- Content delivery manager
- Create an Iris campaign
- Custom Segment Re-Use Request
- Custom Segment Request
- Dynamic Messaging Administration
- (many more - uses custom IrisNav template as landing)

---

## Migration Strategy

### Phase 1: Audit & Deduplicate
1. **Map overlap** — Identify topics covered in multiple sources (e.g., "Iris Overview" exists in eng.ms AND SharePoint)
2. **Identify the freshest version** of each topic using the source ranking (eng.ms/iris-wiki > SharePoint > eng.ms/ideas-wiki > OSGWiki)
3. **Flag stale content** — pages in OSGWiki that are outdated or superseded by newer sources
4. **Decide: update or retire** — some old OSGWiki pages may cover deprecated features (Campaign Memory Deprecated, CDMLite)

### Phase 2: Content Migration
For each page being migrated:
1. Extract content from source (Playwright can do this)
2. Convert to MediaWiki wikitext format (matching OSGWiki conventions)
3. Add standard templates: `{{PageOwner:alias@microsoft.com}}`, `{{IrisNav}}`
4. Add `[[Category:Iris]]` at bottom
5. Create/update the OSGWiki page

**Migration order (by topic cluster):**

| Cluster | Pages to migrate | Primary source |
|---------|-----------------|----------------|
| Getting Started | Iris Overview, Step-by-Step Guide | eng.ms/iris-wiki + SharePoint |
| Targeting & Audiences | Iris Targeting, Custom Segments | eng.ms/iris-wiki + OSGWiki |
| Analytics | Analytics & Measurement, Reporting | eng.ms/iris-wiki + eng.ms/ideas-wiki |
| Experimentation | Iris Experimentation | eng.ms/iris-wiki |
| Governance & Compliance | Iris Governance, Privacy & Compliance | eng.ms/iris-wiki + eng.ms/ideas-wiki |
| Engineering | Engineering Resources, Data Platform, APIs | eng.ms/iris-wiki + eng.ms/ideas-wiki |
| Campaign Management | Create a campaign, Campaign Memory V2 | OSGWiki (refresh) |
| Content & Creatives | Email Creatives Tool (NEW), Content delivery | New + OSGWiki |
| AI & Automation | IDEAS Copilot | eng.ms/ideas-wiki |
| Access & Onboarding | Getting Access, Help | eng.ms/ideas-wiki |

### Phase 3: Redirects & Deprecation
1. **eng.ms pages** — Add a banner at the top: "This content has moved to [OSGWiki link]. This page is no longer maintained."
2. **SharePoint** — Update the Iris Overview page to link to OSGWiki as canonical source
3. **Old OSGWiki pages** — Update deprecated pages with a notice or redirect to the refreshed version

### Phase 4: Governance
- Assign `{{PageOwner}}` to each page
- Establish a review cadence (quarterly?)
- Add "Last reviewed" dates
- Set up the IrisNav template to reflect the new consolidated structure

---

## Proposed OSGWiki Structure

```
Category:Iris (landing page with IrisNav)
├── Iris Overview
├── Getting Started with Iris
│   ├── Create an Iris campaign (refreshed)
│   └── Getting Access
├── Iris Targeting
│   ├── Custom Segment Request
│   └── Custom Segment Re-Use Request
├── Iris Analytics & Measurement
├── Iris Experimentation
├── Iris Governance
├── Content & Creatives
│   ├── Email Creatives (NEW - PUBLISHED)
│   ├── Iris Content (ICMS) (NEW - PUBLISHED)
│   ├── ICMS Content Authoring (NEW - PUBLISHED)
│   ├── Booking Editorial Content Blocks
│   └── Content delivery manager
├── Campaign Management
│   └── Campaign Memory V2
├── Engineering Resources
│   ├── ARC API
│   ├── CDM
│   └── Data Platform
├── AI & Automation
│   └── IDEAS Copilot
├── Partner Team Resources
└── Help & Support
```

---

## Automation Plan

Using the Playwright auth we've set up, we can:
1. **Read** each eng.ms/SharePoint page content programmatically
2. **Convert** to wikitext (automated with a script)
3. **Preview** converted pages locally before committing
4. **Create** pages on OSGWiki via the edit form (Playwright can fill the textarea and submit)

### What requires manual review:
- Deciding which version of duplicated content to keep
- Verifying technical accuracy of stale content before migration
- Updating IrisNav template to reflect new page structure
- Assigning page owners

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Stale content migrated as-is | Review each page with topic SME before publishing |
| Broken internal links | Search-and-replace old URLs with new OSGWiki links |
| Auth tokens expire | Re-authenticate via Playwright persistent context |
| Users bookmarked old locations | Add redirects/banners pointing to OSGWiki |
| Loss of page history | Note original source URL at bottom of migrated page |

---

## Next Steps

1. [ ] Decide on page naming convention (spaces vs underscores, prefixes like "Iris/")
2. [ ] Review the proposed structure above
3. [ ] Pick a pilot cluster to migrate first (suggest: "Getting Started" or "Content & Creatives")
4. [ ] Run the automated extraction on the pilot pages
5. [ ] Review and publish pilot pages
6. [ ] Iterate on remaining clusters
