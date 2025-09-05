import type { WitnessContext } from '@midnight-ntwrk/compact-runtime';

export type VerifiableCredential = {
  results: {
    cholesterol: bigint;
    bloodPressure: bigint;
    isSmoker: boolean;
  };
  signature: Uint8Array;
};

export type VerifierPrivateState = {
  secret: Uint8Array;
  credential?: VerifiableCredential;
};

export const witnesses = {
  ownerSecretKey: ({ privateState }: WitnessContext<any, VerifierPrivateState>): [VerifierPrivateState, Uint8Array] => {
    return [privateState, privateState.secret];
  },
  userCredential: ({ privateState }: WitnessContext<any, VerifierPrivateState>): [VerifierPrivateState, VerifiableCredential] => {
    const cred: VerifiableCredential = privateState.credential || {
      results: {
        cholesterol: 0n,
        bloodPressure: 0n,
        isSmoker: false,
      },
      signature: new Uint8Array(32),
    };
    return [privateState, cred];
  },
};