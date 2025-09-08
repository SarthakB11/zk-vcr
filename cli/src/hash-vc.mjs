import * as compact from '@midnight-ntwrk/compact-runtime';

// These classes are copied from the generated file:
// zk-vcr/contract/src/managed/zk_vcr/contract/index.cjs
// They are needed to correctly serialize the structs for hashing.

const _descriptor_0 = new compact.CompactTypeBytes(32);
const _descriptor_1 = new compact.CompactTypeBoolean();
// The second argument to CompactTypeUnsignedInteger is the size in bytes.
// Uint<64> is 8 bytes.
const _descriptor_3 = new compact.CompactTypeUnsignedInteger(18446744073709551615n, 8);

class _LabResults_0 {
  alignment() {
    return _descriptor_3.alignment().concat(_descriptor_3.alignment().concat(_descriptor_1.alignment()));
  }
  fromValue(value_0) {
    // This function is not needed for hashing, so it's left empty.
    return {}
  }
  toValue(value_0) {
    return _descriptor_3.toValue(value_0.cholesterol).concat(_descriptor_3.toValue(value_0.bloodPressure).concat(_descriptor_1.toValue(value_0.isSmoker)));
  }
}

class _VcSignaturePayload_0 {
  alignment() {
    const labResultsSchema = new _LabResults_0();
    return labResultsSchema.alignment().concat(_descriptor_0.alignment());
  }
  fromValue(value_0) {
    // This function is not needed for hashing, so it's left empty.
    return {}
  }
  toValue(value_0) {
    const labResultsSchema = new _LabResults_0();
    return labResultsSchema.toValue(value_0.results).concat(_descriptor_0.toValue(value_0.issuerKey));
  }
}

const labResultsSchema = new _LabResults_0();
const vcSignaturePayloadSchema = new _VcSignaturePayload_0();

const [, , ownerSkHex, cholesterol, bloodPressure, isSmoker] = process.argv;

const ownerSk = Buffer.from(ownerSkHex, 'hex');

// Derive Public Key
const prefixString = "zk-vcr:owner-pk";
const prefixBuffer = Buffer.alloc(32, 0);
prefixBuffer.write(prefixString, 'utf-8');

const vectorType = new compact.CompactTypeVector(2, new compact.CompactTypeBytes(32));
const pkValueToHash = [
    prefixBuffer,
    ownerSk,
];
const issuerPk = Buffer.from(compact.persistentHash(vectorType, pkValueToHash));

// Sign VC
const sigValueToHash = {
    results: {
        cholesterol: BigInt(cholesterol),
        bloodPressure: BigInt(bloodPressure),
        isSmoker: isSmoker === 'true',
    },
    issuerKey: issuerPk,
};

const signature = Buffer.from(compact.persistentHash(vcSignaturePayloadSchema, sigValueToHash));

// Output both values as a JSON object
const output = {
    publicKey: issuerPk.toString('hex'),
    signature: signature.toString('hex'),
};

process.stdout.write(JSON.stringify(output));
