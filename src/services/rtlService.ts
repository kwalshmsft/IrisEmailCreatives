/**
 * Service for handling RTL (right-to-left) language support.
 * - Detects RTL locales using browser Intl API
 * - Transforms authored HTML into Razor-flavored output for ICMS publish
 */

// Known RTL language codes (fallback when Intl.Locale.textInfo is unsupported)
const RTL_LANGUAGES = new Set([
  'ar', 'arc', 'dv', 'fa', 'ha', 'he', 'khw', 'ks', 'ku', 'ps', 'ur', 'yi',
]);

export function isRtlLocale(locale: string): boolean {
  if (!locale) return false;

  // Try modern API first (Chrome 99+, not yet in all browsers)
  try {
    const intlLocale = new Intl.Locale(locale) as any;
    if (intlLocale.textInfo?.direction) {
      return intlLocale.textInfo.direction === 'rtl';
    }
  } catch {
    // Fall through to manual check
  }

  // Fallback: check primary language subtag
  const primaryLang = locale.split('-')[0].toLowerCase();
  return RTL_LANGUAGES.has(primaryLang);
}

/**
 * The Razor RTL block to inject at the top of published templates.
 */
const RAZOR_RTL_BLOCK = `@{
    var isRTL = Culture.TextInfo.IsRightToLeft;
    var direction = Html.Raw("");
    var directionModifier = Html.Raw("left");

    if(isRTL)
    {
         direction = Html.Raw("dir=\\"rtl\\"");
         directionModifier = Html.Raw("right");
    }
}
`;

/**
 * Transforms clean authored HTML into Razor-flavored HTML for ICMS.
 * - Injects the RTL variable block at the top (after doctype)
 * - Replaces <html lang="..."> with <html lang="@Culture.Name" @direction>
 * - Replaces text-align: left → text-align: @directionModifier
 * - Replaces align="left" → align="@directionModifier"
 */
export function transformForPublish(html: string): string {
  let output = html;

  // Inject Razor RTL block after <!DOCTYPE html> (or at the very top)
  const doctypeMatch = output.match(/<!DOCTYPE\s+html\s*>/i);
  if (doctypeMatch) {
    const insertPos = doctypeMatch.index! + doctypeMatch[0].length;
    output = output.slice(0, insertPos) + '\n' + RAZOR_RTL_BLOCK + output.slice(insertPos);
  } else {
    output = RAZOR_RTL_BLOCK + output;
  }

  // Replace <html> tag: set lang="@Culture.Name", replace dir="..." with @direction
  output = output.replace(/<html([^>]*)>/i, (match, attrs: string) => {
    // Remove existing lang="..."
    let cleaned = attrs.replace(/\slang\s*=\s*["'][^"']*["']/i, '');
    // Remove existing dir="..."
    cleaned = cleaned.replace(/\sdir\s*=\s*["'][^"']*["']/i, '');
    return `<html${cleaned} lang="@Culture.Name" @direction>`;
  });

  // Replace text-align: left with text-align: @directionModifier (in inline styles)
  output = output.replace(/text-align:\s*left/gi, 'text-align: @directionModifier');

  // Replace align="left" with align="@directionModifier"
  output = output.replace(/align=["']left["']/gi, 'align="@directionModifier"');

  // Inject @direction into <table>, <td>, and <th> tags (replace existing dir="..." or append)
  output = output.replace(/<(table|td|th)([^>]*)>/gi, (match, tag: string, attrs: string) => {
    if (/\bdir\s*=/i.test(attrs)) {
      return `<${tag}${attrs.replace(/\bdir\s*=\s*["'][^"']*["']/i, ' @direction')}>`;
    }
    return `<${tag}${attrs} @direction>`;
  });

  // Escape CSS at-rules (@media, @font-face, @import, @keyframes) to @@ so ICMS
  // Razor engine doesn't interpret them as code expressions.
  output = output.replace(/@(media|font-face|import|keyframes|supports|charset)\b/g, '@@$1');

  return output;
}

export const rtlService = {
  isRtlLocale,
  transformForPublish,
};
