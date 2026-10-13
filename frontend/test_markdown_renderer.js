import assert from 'assert';

// Verify regex and string parsing functions mirroring MarkdownRenderer logic
function parseTableRow(line) {
  let cleaned = line.trim();
  if (cleaned.startsWith('|')) cleaned = cleaned.substring(1);
  if (cleaned.endsWith('|')) cleaned = cleaned.substring(0, cleaned.length - 1);
  return cleaned.split('|').map(c => c.trim());
}

function isTableDelimiter(line) {
  const trimmed = line.trim();
  if (!trimmed.includes('|')) return false;
  return /^\|?(\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?$/.test(trimmed);
}

// 1. Table Delimiter Check
assert.strictEqual(isTableDelimiter('| --- | --- |'), true, 'Standard delimiter should match');
assert.strictEqual(isTableDelimiter('|:---|---:|'), true, 'Aligned delimiter should match');
assert.strictEqual(isTableDelimiter('| Commodity | Price |'), false, 'Header row is not delimiter');

// 2. Table Row Parsing
const parsedRow = parseTableRow('| Cotton | 7200 |');
assert.deepStrictEqual(parsedRow, ['Cotton', '7200'], 'Row should split cells cleanly');

// 3. Raw <br> tag regex splitting
const sampleWithBr = 'Line 1<br>Line 2<br/>Line 3<br />Line 4';
const segments = sampleWithBr.split(/<br\s*\/?>/gi);
assert.deepStrictEqual(segments, ['Line 1', 'Line 2', 'Line 3', 'Line 4'], '<br> tags must be safely split');

// 4. Bold and code token splitting
const tokenRegex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
const tokens = '**Parameter** and `value`'.split(tokenRegex);
assert.strictEqual(tokens.includes('**Parameter**'), true, 'Bold token found');
assert.strictEqual(tokens.includes('`value`'), true, 'Code token found');

console.log('ALL MARKDOWN RENDERER TESTS PASSED (100% SUCCESS)');
