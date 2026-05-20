import JSZip from 'jszip';
import { IrisContentInfo, IrisContentItem, IrisImportResult, StoredFileInfo } from '../models/localization';
import { transformForPublish } from './rtlService';

const readAttribute = (element: Element, names: string[]) => {
  const match = names
    .map((name) => element.getAttribute(name))
    .find((value) => typeof value === 'string' && value.trim().length > 0);

  return match?.trim() ?? null;
};

const readChildText = (element: Element, names: string[]) => {
  const match = names
    .map((name) => Array.from(element.children).find((child) => child.tagName.toLowerCase() === name.toLowerCase()))
    .find((child) => child && child.textContent && child.textContent.trim().length > 0);

  return match?.textContent?.trim() ?? null;
};

const normalizeLocale = (value: string) => {
  const trimmed = value.trim();
  const match = trimmed.match(/^([a-zA-Z]{2,3})(?:-([a-zA-Z]{2,4}))?$/);
  if (!match) {
    return null;
  }

  return match[2] ? `${match[1].toLowerCase()}-${match[2].toUpperCase()}` : match[1].toLowerCase();
};

const extractVariants = (element: Element) => {
  const values = new Set<string>();
  const rawValues = [
    readAttribute(element, ['locale', 'Locale', 'variant', 'Variant', 'variants', 'Variants', 'language', 'Language']),
    readChildText(element, ['locale', 'Locale', 'variant', 'Variant', 'variants', 'Variants', 'language', 'Language']),
  ].filter((value): value is string => Boolean(value));

  rawValues.forEach((value) => {
    value
      .split(/[;,|\s]+/)
      .map((part) => normalizeLocale(part))
      .filter((locale): locale is string => Boolean(locale))
      .forEach((locale) => values.add(locale));
  });

  return Array.from(values).sort((left, right) => left.localeCompare(right));
};

export const irisContentImportService = {
  parseExport(xmlContent: string): IrisContentInfo {
    const document = new DOMParser().parseFromString(xmlContent, 'application/xml');
    const parserError = document.querySelector('parsererror');
    if (parserError) {
      throw new Error('The XML file could not be parsed.');
    }

    const items = new Map<string, IrisContentItem>();
    Array.from(document.getElementsByTagName('*')).forEach((element, index) => {
      const id =
        readAttribute(element, ['id', 'ID', 'itemId', 'ItemId', 'contentId', 'ContentId']) ??
        readChildText(element, ['id', 'ID', 'itemId', 'ItemId', 'contentId', 'ContentId']);
      const name =
        readAttribute(element, ['name', 'Name', 'title', 'Title']) ??
        readChildText(element, ['name', 'Name', 'title', 'Title']);

      if (!id && !name) {
        return;
      }

      const resolvedId = id ?? `item-${index + 1}`;
      if (!items.has(resolvedId)) {
        items.set(resolvedId, {
          id: resolvedId,
          name: name ?? element.tagName,
          existingVariants: extractVariants(element),
        });
      }
    });

    return {
      items: Array.from(items.values()).sort((left, right) => left.name.localeCompare(right.name)),
    };
  },

  async generateImportPackage(
    info: IrisContentInfo,
    sourceFileName: string,
    generatedFiles: StoredFileInfo[],
    getGeneratedContent: (fileName: string) => string | null,
  ): Promise<IrisImportResult> {
    const zip = new JSZip();
    const variants = Array.from(
      new Set(generatedFiles.map((file) => file.locale).filter((locale): locale is string => Boolean(locale))),
    ).sort((left, right) => left.localeCompare(right));

    zip.file(
      'manifest.json',
      JSON.stringify(
        {
          createdAt: new Date().toISOString(),
          sourceFileName,
          variants,
          itemCount: info.items.length,
        },
        null,
        2,
      ),
    );
    zip.file('iris-items.json', JSON.stringify(info.items, null, 2));

    const localizedFolder = zip.folder('localized-html');
    generatedFiles.forEach((file) => {
      const content = getGeneratedContent(file.fileName);
      if (localizedFolder && content) {
        localizedFolder.file(file.fileName, transformForPublish(content));
      }
    });

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    return { variants, zipBlob };
  },
};
