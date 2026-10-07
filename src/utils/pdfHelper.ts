import jsPDF from 'jspdf';

/**
 * Robustly instantiates jsPDF handling ESM / CommonJS default export discrepancies
 * to prevent 'Illegal constructor' errors in Vite production bundles.
 */
export function createJSPDFInstance(options?: any): jsPDF {
  const Constructor = (jsPDF as any).jsPDF || (jsPDF as any).default || jsPDF;
  if (typeof Constructor !== 'function') {
    throw new Error('jsPDF constructor not found or invalid.');
  }
  return new Constructor(options);
}
