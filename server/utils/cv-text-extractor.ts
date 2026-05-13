import mammoth from 'mammoth';
import path from 'path';

export async function extractTextFromCV(buffer: Buffer, fileName: string): Promise<string> {
  const ext = path.extname(fileName).toLowerCase();

  try {
    if (ext === '.pdf') {
      return await extractFromPDF(buffer);
    } else if (ext === '.docx') {
      return await extractFromDocx(buffer);
    } else if (ext === '.doc') {
      return await extractFromDoc(buffer);
    }
  } catch (error: any) {
    console.error(`[CV Extractor] Failed to extract text from ${fileName}:`, error.message);
  }

  return '';
}

async function extractFromPDF(buffer: Buffer): Promise<string> {
  try {
    // Lazy-load to avoid crashing server boot on environments without canvas bindings.
    const { PDFParse } = await import('pdf-parse');
    const parser: any = new PDFParse({ data: new Uint8Array(buffer), verbosity: 0 });
    await parser.load();
    const result = await parser.getText();
    const text = typeof result === 'string' ? result : result.text || '';
    return cleanText(text);
  } catch (error: any) {
    console.error(`[CV Extractor] PDF parsing failed: ${error?.message || error}`);
    return '';
  }
}

async function extractFromDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return cleanText(result.value);
}

async function extractFromDoc(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    if (result.value && result.value.trim().length > 0) {
      return cleanText(result.value);
    }
  } catch (e: any) {
    console.warn(`[CV Extractor] mammoth could not parse .doc file, attempting basic text extraction: ${e.message}`);
  }

  const rawText = buffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t]/g, ' ');
  const meaningful = rawText.replace(/\s{3,}/g, ' ').trim();
  if (meaningful.length > 50) {
    return cleanText(meaningful);
  }

  console.warn('[CV Extractor] .doc file could not be parsed - text extraction limited for legacy .doc format');
  return '';
}

export function extractPhoneFromText(text: string, defaultCountryCode: string = '+91'): string | null {
  if (!text) return null;
  const patterns = [
    /\+\d{1,4}[\s\-.]?\(?\d{2,4}\)?[\s\-.]?\d{3,4}[\s\-.]?\d{3,4}/g,
    /\(?\d{3,4}\)?[\s\-.]?\d{3,4}[\s\-.]?\d{3,4}/g,
    /\d{10,13}/g,
  ];

  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches) {
      for (const match of matches) {
        const digits = match.replace(/\D/g, '');
        if (digits.length >= 10 && digits.length <= 15) {
          return formatPhoneInternational(digits, defaultCountryCode);
        }
      }
    }
  }

  return null;
}

function formatPhoneInternational(digits: string, defaultCountryCode: string): string {
  if (digits.startsWith('00')) {
    digits = digits.substring(2);
  }

  const countryDigits = defaultCountryCode.replace(/\D/g, '');

  if (digits.length >= 11 && digits.startsWith(countryDigits)) {
    return '+' + digits;
  }

  if (digits.length === 10) {
    return defaultCountryCode + digits;
  }

  if (digits.length === 11 && digits.startsWith('1')) {
    return '+' + digits;
  }

  if (digits.length >= 11 && digits.length <= 15) {
    return '+' + digits;
  }

  return defaultCountryCode + digits;
}

function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}
