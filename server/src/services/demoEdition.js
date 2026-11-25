const DOWNLOADABLE_ORDER_STATUSES = Object.freeze([
  'PAID',
  'PREPARING',
  'SHIPPED',
  'DELIVERED',
]);

function singleLine(value) {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function createDownloadFilename(title) {
  const slug = singleLine(title)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');

  return `${slug || 'libro'}-demo-edition.txt`;
}

function createDemoEdition(book) {
  const title = singleLine(book.title) || 'Untitled';
  const author = singleLine(book.author) || 'Unknown author';

  return [
    'LIBROYA — DEMO EDITION',
    '',
    `Title: ${title}`,
    `Author: ${author}`,
    '',
    'DEMO NOTICE',
    'This is a generated demonstration edition for the LibroYa lab.',
    'No commercial book file was supplied. This text is not the published book',
    'and must not be sold or redistributed as a commercial e-book.',
    '',
    'Thank you for testing LibroYa.',
    '',
  ].join('\n');
}

module.exports = {
  DOWNLOADABLE_ORDER_STATUSES,
  createDemoEdition,
  createDownloadFilename,
};
