// hash-secret.mjs
import { persistentHash, bigIntToValue, CompactTypeField } from '@midnight-ntwrk/compact-runtime';
import { toHex } from '@midnight-ntwrk/midnight-js-utils';

const secretString = process.argv[2];
if (!secretString) {
  console.error('Please provide a secret number as an argument.');
  process.exit(1);
}

const secretBigInt = BigInt(secretString);

// The circuit does persistentHash<Field>(secret). We need to replicate that.
const secretValue = bigIntToValue(secretBigInt);
const hashBuffer = persistentHash(new CompactTypeField(), secretValue);

console.log(toHex(hashBuffer));
