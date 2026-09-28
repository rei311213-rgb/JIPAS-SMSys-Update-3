/**
 * Utility function to print HTML content using a hidden iframe.
 * This allows printing specific content without leaving the page or opening a new tab.
 */
export function printContent(html: string, title: string = 'Print Job') {
  // 1. Create a hidden iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  iframe.title = title;

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) {
    console.error('[printUtils] Could not access iframe document');
    return;
  }

  // 2. Write the content to the iframe
  doc.open();
  
  // Collect all styles from the current document
  const styleTags = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map(tag => tag.outerHTML)
    .join('\n');

  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        ${styleTags}
        <style>
          /* Basic reset for printing */
          body { margin: 0; padding: 0; background-color: white !important; }
          
          @media print {
            @page { margin: 0; }
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        ${html}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>
      </body>
    </html>
  `);
  doc.close();

  // 3. Clean up the iframe after a delay (enough for the print dialog to open)
  // Note: We can't perfectly know when they close the print dialog in all browsers,
  // but usually once window.print() is called, the process is handed over.
  setTimeout(() => {
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
  }, 10000); // 10 seconds should be plenty
}

/**
 * Utility function to print a PDF blob using a hidden iframe.
 */
export function printBlob(blob: Blob) {
  const blobUrl = URL.createObjectURL(blob);
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.src = blobUrl;
  
  document.body.appendChild(iframe);

  iframe.onload = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(iframe);
      URL.revokeObjectURL(blobUrl);
    }, 10000);
  };
}
