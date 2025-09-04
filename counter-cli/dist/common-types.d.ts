import { type VerifierPrivateState, Verifier } from '@midnight-ntwrk/verifier-contract';
import type { ImpureCircuitId, MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import type { DeployedContract, FoundContract } from '@midnight-ntwrk/midnight-js-contracts';
export type VerifierCircuits = ImpureCircuitId<Verifier.Contract<VerifierPrivateState>>;
export declare const VerifierPrivateStateId = "verifierPrivateState";
export type VerifierProviders = MidnightProviders<VerifierCircuits, typeof VerifierPrivateStateId, VerifierPrivateState>;
export type VerifierContract = Verifier.Contract<VerifierPrivateState>;
export type DeployedVerifierContract = DeployedContract<VerifierContract> | FoundContract<VerifierContract>;
