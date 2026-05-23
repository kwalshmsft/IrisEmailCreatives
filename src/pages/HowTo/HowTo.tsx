import React from 'react';

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 760,
    fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: 14,
    lineHeight: 1.6,
  },
  title: { fontSize: 24, fontWeight: 600, margin: '12px 0 16px 0' },
  sectionTitle: { fontSize: 18, fontWeight: 600, margin: '32px 0 12px 0' },
  infoBox: {
    padding: 16,
    backgroundColor: '#f3f2f1',
    borderRadius: 4,
    boxShadow: '0 1.6px 3.6px 0 rgba(0,0,0,0.132), 0 0.3px 0.9px 0 rgba(0,0,0,0.108)',
    marginBottom: 16,
  },
  codeBlock: {
    backgroundColor: '#f3f2f1',
    padding: 16,
    borderRadius: 4,
    fontFamily: 'Consolas, monospace',
    fontSize: 13,
    overflowX: 'auto',
    whiteSpace: 'pre-wrap',
  },
  inlineCode: {
    backgroundColor: '#f3f2f1',
    padding: '2px 6px',
    borderRadius: 3,
    fontFamily: 'Consolas, monospace',
    fontSize: 13,
  },
  separator: { border: 'none', borderTop: '1px solid #edebe9', margin: '32px 0' },
  mutedText: { color: '#605e5c' },
  link: { color: '#005a9e' },
  paragraph: { margin: '0 0 16px 0' },
  list: { margin: '8px 0 0 20px', padding: 0 },
  listItem: { marginBottom: 8 },
  subheading: { fontSize: 15, fontWeight: 600, margin: '20px 0 8px 0' },
};

const InlineCode: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <code style={styles.inlineCode}>{children}</code>
);

const Link: React.FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => (
  <a href={href} style={styles.link} target="_blank" rel="noreferrer">
    {children}
  </a>
);

export const HowTo: React.FC = () => {
  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Email Content Editor: Step-by-Step Guide</h1>
      <p style={styles.paragraph}>
        This tool helps you create, edit, check responsiveness, localize, and prepare email content
        for Iris campaigns. The gallery is your starting point for all email creative work.
      </p>

      <div style={styles.infoBox}>
        <strong>End-to-End Process:</strong>
        <ol style={styles.list}>
          <li style={styles.listItem}>
            <strong>Start from the Gallery</strong> — click <strong>+ New Email</strong> to create from
            scratch, or <strong>Upload HTML</strong> to import an existing HTML file as a starting point
          </li>
          <li style={styles.listItem}>
            <strong>Edit content</strong> in the editor — author HTML email content using the
            visual editor, Raw HTML, or Plain Text tabs
          </li>
          <li style={styles.listItem}>
            <strong>Check Responsiveness</strong> — run the built-in analyzer to detect and fix issues
            for mobile, Outlook, and cross-platform compatibility
          </li>
          <li style={styles.listItem}>
            <strong>Save your work</strong> — give it a display name and save. Content is automatically
            classified under the preset taxonomy (M365 Commercial End User Email) and assigned a unique
            content ID.
          </li>
          <li style={styles.listItem}>
            <strong>Localize content</strong> — in the Locale Specific Assets section, select target
            locales, download the .csv, send for translation, and upload the completed file. Translated
            content is saved automatically and can be toggled in the editor.
          </li>
          <li style={styles.listItem}>
            <strong>Create the content object in ICMS</strong> using the{' '}
            <strong>IrisEmailTemplate</strong> content type under InvariantCulture
          </li>
          <li style={styles.listItem}>
            <strong>Export for localization</strong> from ICMS — right-click the content object and
            export the .xml
          </li>
          <li style={styles.listItem}>
            <strong>Generate the import package</strong> in the Export tab — upload the .xml and
            source content to produce a .zip with locale folders
          </li>
          <li style={styles.listItem}>
            <strong>Import into ICMS</strong> — use "Import from Localization" to bring in all
            locale variants
          </li>
        </ol>
      </div>

      <div style={styles.infoBox}>
        <strong>What this tool does:</strong>
        <ul style={styles.list}>
          <li style={styles.listItem}>Author and edit HTML email content with a visual editor</li>
          <li style={styles.listItem}>
            Analyze and fix email HTML for responsiveness and cross-platform compatibility
          </li>
          <li style={styles.listItem}>
            Store email creatives in a browser-based gallery with unique content IDs and preset taxonomy
          </li>
          <li style={styles.listItem}>
            Manage localized versions inline — download .csv for translation, upload translations,
            and switch between locales in the main editor
          </li>
          <li style={styles.listItem}>Build ICMS import packages for localized content variants</li>
        </ul>
      </div>

      <div style={styles.infoBox}>
        <strong>What this tool does not do:</strong>
        <ul style={styles.list}>
          <li style={styles.listItem}>
            <strong>Publish content</strong> — this tool does not publish content to ICMS or Iris.
            Publishing is a manual process that takes place in the ICMS desktop client (download at{' '}
            <Link href="https://aka.ms/geticmsclient">aka.ms/geticmsclient</Link>).
          </li>
          <li style={styles.listItem}>
            Send production emails — it produces the HTML content that gets uploaded to ICMS via the
            desktop tool
          </li>
        </ul>
      </div>

      <hr style={styles.separator} />

      <h2 style={styles.sectionTitle}>Gallery</h2>
      <p style={styles.paragraph}>
        The Gallery is the landing page for Email Creatives (at <InlineCode>/creatives/email</InlineCode>).
        It shows all saved email content with columns for Name (with content ID), Surface, Updated By,
        Last Updated, and Status (Draft or Published).
      </p>

      <h3 style={styles.subheading}>Starting a New Email</h3>
      <ul style={styles.list}>
        <li style={styles.listItem}>
          Click <strong>+ New Email</strong> to open the editor with a blank email template.
        </li>
        <li style={styles.listItem}>
          Click <strong>Upload HTML</strong> to import an existing HTML file as your starting point.
          The file opens directly in the editor where you can review, edit, and save it.
        </li>
      </ul>

      <h3 style={styles.subheading}>Opening Existing Content</h3>
      <ul style={styles.list}>
        <li style={styles.listItem}>
          Click any file name in the gallery list to open it in the editor. The URL updates to
          include the content ID so it can be bookmarked.
        </li>
        <li style={styles.listItem}>
          Use the <strong>Filters</strong> button to narrow the list by Status (Draft or Published).
        </li>
        <li style={styles.listItem}>
          Click column headers to sort by Name, Surface, Updated By, Last Updated, or Status.
        </li>
      </ul>

      <hr style={styles.separator} />

      <h2 style={styles.sectionTitle}>Create Tab</h2>
      <p style={styles.paragraph}>
        The Create tab is where you author email content. The source locale is set
        via the <InlineCode>&lt;html lang="..."&gt;</InlineCode> attribute.
      </p>

      <h3 style={styles.subheading}>Editing</h3>
      <ul style={styles.list}>
        <li style={styles.listItem}>
          <strong>Visual Editor</strong> — edit text, spacing, buttons, and images visually using
          a rich text editor.
        </li>
        <li style={styles.listItem}>
          <strong>Raw HTML</strong> — edit the HTML directly when you need precise markup control.
        </li>
        <li style={styles.listItem}>
          <strong>Plain Text</strong> — auto-generated from the HTML. You can edit it manually
          or regenerate it from the current HTML at any time.
        </li>
      </ul>

      <h3 style={styles.subheading}>Subject Line</h3>
      <p style={styles.paragraph}>
        The subject line field sits above the editor tabs. It is saved alongside the HTML and plain
        text as part of the content object.
      </p>

      <h3 style={styles.subheading}>Check Responsiveness</h3>
      <p style={styles.paragraph}>
        Click <strong>Check Responsiveness</strong> to analyze the current HTML for email compatibility
        issues. The analyzer detects and can auto-fix:
      </p>
      <ul style={styles.list}>
        <li style={styles.listItem}>Fixed-width tables, cells, images, and containers</li>
        <li style={styles.listItem}>Missing viewport meta tag and media queries</li>
        <li style={styles.listItem}>Outlook-specific issues (MSO conditionals, flex/grid, max-width fallbacks)</li>
        <li style={styles.listItem}>Word/Office export bloat (mso-* styles, Office XML, invalid attributes)</li>
        <li style={styles.listItem}>Deprecated elements ({'<font>'} tags, empty elements, outdated meta)</li>
        <li style={styles.listItem}>Missing charset, alt attributes, broken links</li>
        <li style={styles.listItem}>Unsupported CSS (position:absolute/fixed, external stylesheets)</li>
        <li style={styles.listItem}>File size warnings (Gmail clips at ~102KB)</li>
      </ul>
      <p style={styles.paragraph}>
        Review individual issues, accept all or selectively, then apply. Use <strong>Revert Fixes</strong> if
        the changes break anything.
      </p>

      <h3 style={styles.subheading}>Preview</h3>
      <p style={styles.paragraph}>
        The preview section shows a live render of the email. Switch between Desktop, Tablet, and
        Mobile viewports, and simulate how the email appears in Standard, Outlook Desktop, Gmail,
        and iOS Mail clients.
      </p>

      <h3 style={styles.subheading}>Locale Specific Assets</h3>
      <p style={styles.paragraph}>
        Expand the Locale Specific Assets section to manage translations:
      </p>
      <ol style={styles.list}>
        <li style={styles.listItem}>
          <strong>Select locales</strong> — click "Select Locales" and check the target languages.
          Selected locales persist across sessions.
        </li>
        <li style={styles.listItem}>
          <strong>Download .csv</strong> — generates a CSV file with the source content (subject, HTML
          strings) and columns for each target locale. The file is RFC 4180 compliant and named after
          the document.
        </li>
        <li style={styles.listItem}>
          <strong>Upload translated .csv</strong> — import the completed translation file. Translated
          content is saved immediately to the document.
        </li>
        <li style={styles.listItem}>
          <strong>Switch locales in the editor</strong> — once translations are imported, locale buttons
          appear above the subject line. Click any locale to load its content into the editor for review
          or editing. Changes to localized versions are saved alongside the source.
        </li>
      </ol>

      <h3 style={styles.subheading}>Saving</h3>
      <p style={styles.paragraph}>
        Click the document name (or "Unsaved document") in the indicator bar to name your file and
        trigger the save dialog. Content is saved locally with a unique content ID and autosaves every
        60 seconds. A countdown appears 10 seconds before each autosave.
      </p>

      <hr style={styles.separator} />

      <h2 style={styles.sectionTitle}>ICMS Razor Syntax &amp; Dynamic Content</h2>
      <p style={styles.paragraph}>Available Variables:</p>
      <ul style={styles.list}>
        <li style={styles.listItem}>
          <InlineCode>@Culture.Name</InlineCode>
        </li>
        <li style={styles.listItem}>
          <InlineCode>@Model.&lt;PropertyName&gt;</InlineCode>
        </li>
        <li style={styles.listItem}>
          <InlineCode>##UnsubscribeLinkPlaceholder##</InlineCode>
        </li>
      </ul>

      <p style={styles.paragraph}>Conditional Logic with code example:</p>
      <pre style={styles.codeBlock}>{`@if (Model.SubscriptionType == "Premium") {
    <p>Exclusive offer for premium members!</p>
} else {
    <p>Upgrade to Premium for exclusive offers!</p>
}

@if (Culture.Name == "en-US") {
    <p>English content here</p>
} else if (Culture.Name == "fr-FR") {
    <p>French content here</p>
}`}</pre>

      <p style={styles.paragraph}>
        Unsubscribe Link Example:{' '}
        <InlineCode>{`<a href="##UnsubscribeLinkPlaceholder##">Unsubscribe</a>`}</InlineCode>
      </p>
      <p style={styles.paragraph}>
        <strong>Note about Razor in visual editor:</strong> Razor syntax is best added and reviewed in
        Raw HTML, because the visual editor may simplify or reformat markup while you are
        editing.
      </p>
      <p style={{ ...styles.paragraph, ...styles.mutedText }}>
        <strong>Note about @ escaping in ICMS import:</strong> Use double at-signs such as{' '}
        <InlineCode>@@Culture.Name</InlineCode> and <InlineCode>@@Model.&lt;PropertyName&gt;</InlineCode>{' '}
        in the source HTML files you upload to ICMS so the content survives the import pipeline correctly.
        In the Razor examples above, single @ is the correct runtime syntax.
      </p>

      <hr style={styles.separator} />

      <h2 style={styles.sectionTitle}>Export Tab</h2>
      <p style={styles.paragraph}>
        The Export tab handles ICMS import package generation — the final step before importing
        localized content into ICMS.
      </p>

      <h3 style={styles.subheading}>Step 1: Load source content</h3>
      <p style={styles.paragraph}>
        Select a published file from the content gallery or upload an HTML file.
      </p>

      <h3 style={styles.subheading}>Step 2: Upload the ICMS export .xml</h3>
      <p style={styles.paragraph}>
        In ICMS, create the content object under InvariantCulture, then right-click it and export the
        .xml that will be used for localization packaging.
      </p>

      <h3 style={styles.subheading}>Step 3: Generate the import package</h3>
      <p style={styles.paragraph}>
        Upload the ICMS .xml export and select the source file to produce a .zip with locale folders
        ready for ICMS import.
      </p>

      <h3 style={styles.subheading}>Step 4: Import into ICMS</h3>
      <p style={styles.paragraph}>
        Use the generated .zip with ICMS "Import from Localization" to create all localized variants
        of the content object.
      </p>

      <p style={styles.paragraph}>File structure example showing the zip layout:</p>
      <pre style={styles.codeBlock}>{`IrisEmailTemplate.zip
├─ en-US/
│  └─ content.xml
├─ fr-FR/
│  └─ content.xml
└─ ja-JP/
   └─ content.xml`}</pre>

      <hr style={styles.separator} />

      <h2 style={styles.sectionTitle}>What the Tool Generates for Each Locale</h2>
      <ul style={styles.list}>
        <li style={styles.listItem}>Localized HTML file (with translated strings and updated <InlineCode>lang</InlineCode> attribute)</li>
        <li style={styles.listItem}>Localized subject line and plain text</li>
        <li style={styles.listItem}>ICMS import .xml (content.xml per locale folder in the .zip)</li>
      </ul>

      <hr style={styles.separator} />

      <h2 style={styles.sectionTitle}>URL Structure &amp; Bookmarking</h2>
      <p style={styles.paragraph}>
        All pages are bookmarkable and directly accessible:
      </p>
      <ul style={styles.list}>
        <li style={styles.listItem}><InlineCode>/creatives/email</InlineCode> — Gallery</li>
        <li style={styles.listItem}><InlineCode>/creatives/email/create</InlineCode> — New email</li>
        <li style={styles.listItem}><InlineCode>/creatives/email/create/&lt;contentId&gt;</InlineCode> — Open specific creative by ID</li>
        <li style={styles.listItem}><InlineCode>/creatives/email/export</InlineCode> — Export / ICMS Import Package Generator</li>
        <li style={styles.listItem}><InlineCode>/creatives/email/howto</InlineCode> — This guide</li>
      </ul>

      <hr style={styles.separator} />

      <h2 style={styles.sectionTitle}>Comments</h2>
      <p style={styles.paragraph}>
        The comments panel is available on the right side of the editor for draft documents. Click the
        vertical "Comments" tab to expand it. Comments are tied to the document's content ID and are
        disabled for published content.
      </p>
    </div>
  );
};

export default HowTo;
