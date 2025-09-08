import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<T> = {
  ownerSecretKey(context: __compactRuntime.WitnessContext<Ledger, T>): [T, Uint8Array];
  userCredential(context: __compactRuntime.WitnessContext<Ledger, T>): [T, { results: { cholesterol: bigint,
                                                                                        bloodPressure: bigint,
                                                                                        isSmoker: boolean
                                                                                      },
                                                                             signature: Uint8Array
                                                                           }];
}

export type ImpureCircuits<T> = {
  getChallenge(context: __compactRuntime.CircuitContext<T>): __compactRuntime.CircuitResults<T, bigint>;
  addIssuer(context: __compactRuntime.CircuitContext<T>, issuerKey_0: Uint8Array): __compactRuntime.CircuitResults<T, []>;
  revokeIssuer(context: __compactRuntime.CircuitContext<T>,
               issuerKey_0: Uint8Array): __compactRuntime.CircuitResults<T, []>;
  submitHealthProof(context: __compactRuntime.CircuitContext<T>,
                    issuerKey_0: Uint8Array,
                    challenge_0: bigint): __compactRuntime.CircuitResults<T, []>;
}

export type PureCircuits = {
}

export type Circuits<T> = {
  getChallenge(context: __compactRuntime.CircuitContext<T>): __compactRuntime.CircuitResults<T, bigint>;
  addIssuer(context: __compactRuntime.CircuitContext<T>, issuerKey_0: Uint8Array): __compactRuntime.CircuitResults<T, []>;
  revokeIssuer(context: __compactRuntime.CircuitContext<T>,
               issuerKey_0: Uint8Array): __compactRuntime.CircuitResults<T, []>;
  submitHealthProof(context: __compactRuntime.CircuitContext<T>,
                    issuerKey_0: Uint8Array,
                    challenge_0: bigint): __compactRuntime.CircuitResults<T, []>;
}

export type Ledger = {
  readonly owner: Uint8Array;
  trustedIssuers: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<[Uint8Array, boolean]>
  };
  usedNonces: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): boolean;
    [Symbol.iterator](): Iterator<[bigint, boolean]>
  };
  readonly modelParameters: { riskThreshold: bigint };
  readonly nonceCounter: bigint;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<T, W extends Witnesses<T> = Witnesses<T>> {
  witnesses: W;
  circuits: Circuits<T>;
  impureCircuits: ImpureCircuits<T>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<T>,
               ownerSk_0: Uint8Array,
               initialThreshold_0: bigint): __compactRuntime.ConstructorResult<T>;
}

export declare function ledger(state: __compactRuntime.StateValue): Ledger;
export declare const pureCircuits: PureCircuits;
