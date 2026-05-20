import React from 'react';

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 760,
    fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: 14,
    lineHeight: 1.6,
  },
  title: { fontSize: 24, fontWeight: 600, margin: '0 0 16px 0' },
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
        This tool helps you create, edit, and prepare email content for Iris campaigns. The gallery
        is your starting point for all email creative work.
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
            visual editor or Raw HTML
          </li>
          <li style={styles.listItem}>
            <strong>Save to a product folder</strong> — organize your content by product and subfolder
          </li>
          <li style={styles.listItem}>
            <strong>Localize content</strong> — switch to the Localize tab, load source HTML, download the
            generated .csv or .xlsx, send for translation, and upload the completed file to produce
            locale-specific HTML
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
            <strong>Generate the import package</strong> in the Localize tab — upload the .xml and
            source content to produce a .zip with locale folders
          </li>
          <li style={styles.listItem}>
            <strong>Import into ICMS</strong> — use "Import from Localization" to bring in all
            locale variants
          </li>
          {/* <li style={styles.listItem}>
            <strong>Render and verify</strong> in the Render tab — view published content from ICMS,
            toggle locales, and test Model values
          </li> */}
        </ol>
      </div>

      <div style={styles.infoBox}>
        <strong>What this tool does:</strong>
        <ul style={styles.list}>
          <li style={styles.listItem}>Author and edit HTML email content with a visual editor</li>
          <li style={styles.listItem}>
            Store templates (starting points) and finished content (locale-specific) in browser-based
            galleries
          </li>
          <li style={styles.listItem}>Generate localization files (.csv/.xlsx) from source HTML</li>
          <li style={styles.listItem}>Build ICMS import packages for localized content variants</li>
          {/* <li style={styles.listItem}>
            Preview published ICMS content with locale switching and Model value rendering
          </li> */}
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
            Store or display localized versions of content — the Localize tab only manages file
            creation for the localization process and ICMS imports
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
        The Gallery is the landing page for Email Creatives. It shows all saved email content organized
        by product folder with columns for Name, Product, Updated By, Last Updated, and Status.
      </p>

      <h3 style={styles.subheading}>Starting a New Email</h3>
      <ul style={styles.list}>
        <li style={styles.listItem}>
          Click <strong>+ New Email</strong> to open the editor with a blank email template.
        </li>
        <li style={styles.listItem}>
          Click <strong>Upload HTML</strong> to import an existing HTML file as your starting point.
          The file opens directly in the editor where you can review, edit, and save it to a product
          folder.
        </li>
      </ul>

      <h3 style={styles.subheading}>Opening Existing Content</h3>
      <ul style={styles.list}>
        <li style={styles.listItem}>
          Click any file name in the gallery list to open it in the editor.
        </li>
        <li style={styles.listItem}>
          Use the <strong>Filters</strong> button to narrow the list by Product or Status.
        </li>
        <li style={styles.listItem}>
          Click column headers to sort by Name, Product, Updated By, Last Updated, or Status.
        </li>
      </ul>

      <hr style={styles.separator} />

      <h2 style={styles.sectionTitle}>Create Tab</h2>
      <p style={styles.paragraph}>
        The Create tab is where you author one language version of email content. The locale is set
        via the <InlineCode>&lt;html lang="..."&gt;</InlineCode> attribute.
      </p>

      <h3 style={styles.subheading}>Step 1: Choose a Starting Point</h3>
      <ul style={styles.list}>
        <li style={styles.listItem}>Start from a blank email (via + New Email in the Gallery) when building a new message from scratch.</li>
        <li style={styles.listItem}>Upload an HTML file (via Upload HTML in the Gallery) to import existing content for editing.</li>
        <li style={styles.listItem}>Click an existing file in the Gallery to revise saved content.</li>
      </ul>

      <h3 style={styles.subheading}>Step 2: Edit Your Content</h3>
      <ul style={styles.list}>
        <li style={styles.listItem}>
          <strong>Visual Editor</strong> — build the layout using content blocks and edit text,
          spacing, buttons, and images visually.
        </li>
        <li style={styles.listItem}>
          <strong>Raw HTML</strong> — edit the generated HTML directly when you need precise markup
          control.
        </li>
      </ul>
      <p style={styles.paragraph}>
        <strong>Note:</strong> For advanced elements, custom attributes, or Razor expressions, switch
        to Raw HTML so you can edit the underlying markup directly.
      </p>

      <h3 style={styles.subheading}>Step 3: Work with Links and Images</h3>
      <p style={styles.paragraph}>
        Add links with full destination URLs and use hosted image URLs so the final email can render
        correctly when it is uploaded to ICMS.
      </p>

      <h3 style={styles.subheading}>Step 4: Set Mobile/Desktop Visibility</h3>
      <p style={styles.paragraph}>
        Use the editor controls to show or hide content by device size when you need separate mobile
        and desktop experiences.
      </p>

      <h3 style={styles.subheading}>Step 5: Save Your Work</h3>
      <p style={styles.paragraph}>
        Save reusable layouts as templates and save completed source files as content so they appear
        in the browser-based galleries for later editing.
      </p>

      <h3 style={styles.subheading}>Step 6: Preview and Download</h3>
      <p style={styles.paragraph}>
        Preview the current email before exporting, then download the HTML file that will be used as
        the source for localization and ICMS import packaging.
      </p>

      <hr style={styles.separator} />

      <h2 style={styles.sectionTitle}>ICMS Razor Syntax &amp; Dynamic Content</h2>
      <p style={styles.paragraph}>Available Variables:</p>
      <ul style={styles.list}>
        <li style={styles.listItem}>
          <InlineCode>@@Culture.Name</InlineCode>
        </li>
        <li style={styles.listItem}>
          <InlineCode>@@Model.&lt;PropertyName&gt;</InlineCode>
        </li>
        <li style={styles.listItem}>
          <InlineCode>##UnsubscribeLinkPlaceholder##</InlineCode>
        </li>
      </ul>

      <p style={styles.paragraph}>Conditional Logic with code example:</p>
      <pre style={styles.codeBlock}>{`@@if (Model.SubscriptionType == "Premium") {
    <p>Exclusive offer for premium members!</p>
} else {
    <p>Upgrade to Premium for exclusive offers!</p>
}

@@if (Culture.Name == "en-US") {
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
        in your source files so the content survives the ICMS import pipeline correctly.
      </p>

      <hr style={styles.separator} />

      <h2 style={styles.sectionTitle}>Localize Tab</h2>
      <h3 style={styles.subheading}>Step 1: Load source content</h3>
      <p style={styles.paragraph}>
        Upload an HTML file or select a published file from the content gallery. Once loaded, .csv
        and .xlsx download links appear in the status bar automatically.
      </p>

      <h3 style={styles.subheading}>Step 2: Translate outside Iris</h3>
      <p style={styles.paragraph}>
        Download the .csv or .xlsx, send it to your translation workflow, and fill in the Translation
        column. The target locale is identified by row (.csv) or sheet name (.xlsx).
      </p>

      <h3 style={styles.subheading}>Step 3: Upload the ICMS export</h3>
      <p style={styles.paragraph}>
        In ICMS, create the content object under InvariantCulture, then right-click it and export the
        .xml that will be used for localization packaging.
      </p>

      <h3 style={styles.subheading}>Step 4: Generate localized files and import package</h3>
      <p style={styles.paragraph}>
        Upload the completed translation file to generate locale-specific HTML. Then upload the ICMS
        .xml export, select the source file, and generate the import package (.zip).
      </p>

      <h3 style={styles.subheading}>Step 5: Import into ICMS</h3>
      <p style={styles.paragraph}>
        Use the generated .zip with ICMS "Import from Localization" to create all localized variants
        of the content object.
      </p>

      <p style={styles.paragraph}>File structure example showing the zip layout:</p>
      <pre style={styles.codeBlock}>{`IrisEmailTemplate.zip
├─ en-US/
│  ├─ content.xml
│  └─ Newsletter_en-US.html
├─ fr-FR/
│  ├─ content.xml
│  └─ Newsletter_fr-FR.html
└─ ja-JP/
   ├─ content.xml
   └─ Newsletter_ja-JP.html`}</pre>

      {/* Render Tab section hidden until operational
      <hr style={styles.separator} />

      <h2 style={styles.sectionTitle}>Render Tab</h2>
      <h3 style={styles.subheading}>Step 1: Open published content</h3>
      <p style={styles.paragraph}>
        Load a published ICMS content item into the Render tab to preview the output that Iris will
        use.
      </p>

      <h3 style={styles.subheading}>Step 2: Toggle locales</h3>
      <p style={styles.paragraph}>
        Switch between locales to confirm each published variant renders the expected content.
      </p>

      <h3 style={styles.subheading}>Step 3: Test Model values</h3>
      <p style={styles.paragraph}>
        Provide sample Model values to validate conditional content and placeholder-driven rendering.
      </p>

      <h3 style={styles.subheading}>Step 4: Verify final output</h3>
      <p style={styles.paragraph}>
        Review the rendered subject, plain text, and HTML output before sign-off.
      </p>

      <p style={{ ...styles.paragraph, ...styles.mutedText }}>
        <strong>Direct linking note:</strong> The Render tab can be linked directly so reviewers can
        open a specific content item and locale for verification.
      </p>
      */}

      <hr style={styles.separator} />

      <h2 style={styles.sectionTitle}>What the Tool Generates for Each Locale</h2>
      <ul style={styles.list}>
        <li style={styles.listItem}>Localized HTML file (with translated strings and updated <InlineCode>lang</InlineCode> attribute)</li>
        <li style={styles.listItem}>ICMS import .xml (content.xml per locale folder in the .zip)</li>
      </ul>
    </div>
  );
};

export default HowTo;
