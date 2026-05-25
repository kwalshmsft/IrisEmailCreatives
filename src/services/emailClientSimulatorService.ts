export type EmailClient = 'standard' | 'outlook-desktop' | 'gmail' | 'ios-mail';

export interface EmailClientInfo {
  id: EmailClient;
  label: string;
  description: string;
}

export const EMAIL_CLIENTS: EmailClientInfo[] = [
  { id: 'standard', label: 'Standard', description: 'No transformations applied' },
  { id: 'outlook-desktop', label: 'Outlook Desktop', description: 'Simulates Word rendering engine limitations' },
  { id: 'gmail', label: 'Gmail', description: 'Strips <style> blocks, class attributes' },
  { id: 'ios-mail', label: 'iOS Mail', description: 'WebKit-based, mostly standards compliant' },
];

export const EMAIL_CLIENT_NOTICES: Record<EmailClient, string | null> = {
  'standard': null,
  'outlook-desktop': '⚠️ Outlook Desktop — max-width→width, flex/grid→block, no border-radius/shadows/opacity/transforms. MSO conditionals revealed, non-MSO content hidden.',
  'gmail': '⚠️ Gmail — Stripped: <style> in <body>, data-* attributes, position styles, <link> stylesheets. Supports <style> in <head> including media queries.',
  'ios-mail': 'ℹ️ iOS Mail — WebKit rendering. Phone numbers auto-linked. Most CSS supported.',
};

// CSS properties not supported by Outlook's Word rendering engine
const OUTLOOK_UNSUPPORTED_PROPERTIES = new Set([
  'border-radius',
  'box-shadow',
  'text-shadow',
  'opacity',
  'transform',
  'transition',
  'animation',
  'background-image',
  'background-size',
  'background-position',
  'background-repeat',
]);

function simulateOutlookDesktop(html: string): string {
  let result = html;

  // Process MSO conditional comments: strip <!--[if !mso]><!-->...<![endif]--> content
  // This content is explicitly hidden from Outlook
  result = result.replace(/<!--\[if !mso[^\]]*\]><!-->([\s\S]*?)<!--<!\[endif\]-->/gi, '');

  // Reveal MSO conditional content by removing the comment wrappers
  // Matches all variants: <!--[if mso]>, <!--[if mso | IE]>, <!--[if gte mso 9]>, etc.
  result = result.replace(/<!--\[if[^\]]*mso[^\]]*\]>([\s\S]*?)<!\[endif\]-->/gi, (match, inner: string) => {
    // Strip XML/Office namespace blocks (metadata like PixelsPerInch, not visible content)
    if (/<xml[\s>]/i.test(inner) || /xmlns:o=/i.test(inner)) {
      return '';
    }
    return inner;
  });

  // Outlook ignores <style> blocks in <body> but supports them in <head>
  // Strip style blocks that appear after <body>
  const bodyIndex = result.search(/<body[\s>]/i);
  if (bodyIndex >= 0) {
    const beforeBody = result.substring(0, bodyIndex);
    let afterBody = result.substring(bodyIndex);
    afterBody = afterBody.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    result = beforeBody + afterBody;
  }

  // Convert max-width to width (Outlook doesn't support max-width but does support width)
  result = result.replace(/style="([^"]*)"/gi, (match, styleContent: string) => {
    let cleaned = styleContent;

    // Replace max-width with width if no explicit width is set
    if (/max-width/i.test(cleaned) && !/(?<!max-)width\s*:/i.test(cleaned)) {
      cleaned = cleaned.replace(/max-width(\s*:\s*[^;]+)/gi, 'width$1');
    } else {
      cleaned = cleaned.replace(/max-width\s*:[^;]*;?/gi, '');
    }

    // Remove unsupported display values but keep the property with fallback
    cleaned = cleaned.replace(/display\s*:\s*(flex|inline-flex|grid|inline-grid)[^;]*/gi, 'display: block');

    // Remove unsupported properties
    const props = cleaned.split(';').filter((prop) => {
      const name = prop.split(':')[0]?.trim().toLowerCase();
      return name && !OUTLOOK_UNSUPPORTED_PROPERTIES.has(name);
    });
    cleaned = props.join(';').replace(/;\s*$/, '').trim();
    if (cleaned && !cleaned.endsWith(';')) cleaned += ';';

    return cleaned ? `style="${cleaned}"` : '';
  });

  return result;
}

function simulateGmail(html: string): string {
  let result = html;

  // Modern Gmail (since 2016) supports <style> in <head> including media queries.
  // It only strips <style> blocks in <body>.
  result = result.replace(/(<body[\s\S]*?)(<style[^>]*>[\s\S]*?<\/style>)/gi, (match, before, style) => before);

  // Gmail strips <link> stylesheet references
  result = result.replace(/<link[^>]*rel="stylesheet"[^>]*>/gi, '');

  // Gmail strips data-* attributes
  result = result.replace(/\s+data-[a-z-]+="[^"]*"/gi, '');

  // Gmail strips position: absolute/fixed/relative
  result = result.replace(/style="([^"]*)"/gi, (match, styleContent: string) => {
    let cleaned = styleContent;
    cleaned = cleaned.replace(/position\s*:\s*(absolute|fixed|relative)[^;]*/gi, '');
    cleaned = cleaned.replace(/;\s*;/g, ';').replace(/^\s*;\s*/, '').trim();
    return cleaned ? `style="${cleaned}"` : '';
  });

  return result;
}

function simulateIosMail(html: string): string {
  // iOS Mail is mostly standards-compliant (WebKit-based)
  // Main differences: auto-links phone numbers/dates, scales viewport
  let result = html;

  // Simulate auto-linking of phone numbers
  result = result.replace(
    /(\b\d{3}[-.]?\d{3}[-.]?\d{4}\b)/g,
    '<a href="tel:$1" style="color:#007aff;text-decoration:none;">$1</a>'
  );

  return result;
}

export const emailClientSimulatorService = {
  simulate(html: string, client: EmailClient): string {
    switch (client) {
      case 'outlook-desktop':
        return simulateOutlookDesktop(html);
      case 'gmail':
        return simulateGmail(html);
      case 'ios-mail':
        return simulateIosMail(html);
      case 'standard':
      default:
        return html;
    }
  },
};
