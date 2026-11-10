// node tests/ciphers.test.js — ARIA/SEED 구현을 공식 테스트 벡터로 검증
require('../assets/js/ciphers.js');
const { ARIA, SEED } = globalThis.KCipher;
const h = s => s.match(/../g).map(v => parseInt(v, 16)), x = a => Array.from(a, v => v.toString(16).padStart(2, '0')).join('');
const cases = [
  ['ARIA-128 (RFC 5794)', ARIA, '000102030405060708090a0b0c0d0e0f', '00112233445566778899aabbccddeeff', 'd718fbd6ab644c739da95f3be6451778'],
  ['ARIA-192 (RFC 5794)', ARIA, '000102030405060708090a0b0c0d0e0f1011121314151617', '00112233445566778899aabbccddeeff', '26449c1805dbe7aa25a468ce263a9e79'],
  ['ARIA-256 (RFC 5794)', ARIA, '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f', '00112233445566778899aabbccddeeff', 'f92bd7c79fb72e2f2b8f80c1972d24fc'],
  ['SEED-128 (RFC 4269)', SEED, '00000000000000000000000000000000', '000102030405060708090a0b0c0d0e0f', '5ebac6e0054e166819aff1cc6d346cdb'],
  ['SEED-128 (OpenSSL)', SEED, '000102030405060708090a0b0c0d0e0f', '00112233445566778899aabbccddeeff', 'af527210eb79c7a023abf348e70c9045']
];
let fail = 0;
for (const [n, C, k, p, c] of cases) {
  const e = x(C.encryptBlock(h(p), h(k))), d = x(C.decryptBlock(h(c), h(k)));
  const ok = e === c && d === p; if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  ${e}`);
}
process.exit(fail ? 1 : 0);
