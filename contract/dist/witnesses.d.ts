import type { WitnessContext } from '@midnight-ntwrk/compact-runtime';
import type { Verifier } from '@midnight-ntwrk/verifier-contract';
export type VerifierPrivateState = {
    secret: number;
};
export declare const witnesses: {
    getSecret: ({ privateState }: WitnessContext<Verifier.Ledger, VerifierPrivateState>) => [VerifierPrivateState, bigint];
};
