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
export declare const witnesses: {
    ownerSecretKey: ({ privateState }: WitnessContext<any, VerifierPrivateState>) => [VerifierPrivateState, Uint8Array];
    userCredential: ({ privateState }: WitnessContext<any, VerifierPrivateState>) => [VerifierPrivateState, VerifiableCredential];
};
