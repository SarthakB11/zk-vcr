// This file is part of midnightntwrk/example-counter.
// Copyright (C) 2025 Midnight Foundation
// SPDX-License-Identifier: Apache-2.0
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may not use this file except in compliance with the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { VerifierSimulator } from "./verifier-simulator.js";
import {
  NetworkId,
  setNetworkId
} from "@midnight-ntwrk/midnight-js-network-id";
import { describe, it, expect } from "vitest";

setNetworkId(NetworkId.Undeployed);

describe("Verifier smart contract", () => {
  it("generates initial ledger state deterministically", () => {
    const simulator0 = new VerifierSimulator();
    const simulator1 = new VerifierSimulator();
    expect(simulator0.getLedger()).toEqual(simulator1.getLedger());
  });

  it("properly initializes ledger state and private state", () => {
    const simulator = new VerifierSimulator();
    const initialLedgerState = simulator.getLedger();
    // This will need to be updated with the actual initial state of the verifier ledger
    expect(initialLedgerState.verifier).toEqual(0n);
    const initialPrivateState = simulator.getPrivateState();
    expect(initialPrivateState).toEqual({ secret: 0 });
  });

  it("verifies a secret correctly", () => {
    const simulator = new VerifierSimulator();
    // This is a placeholder test. The actual implementation will depend on the verifier logic.
    const nextLedgerState = simulator.verify(123, 456);
    // This will need to be updated with the expected state after verification
    expect(nextLedgerState.verifier).toEqual(1n);
    const nextPrivateState = simulator.getPrivateState();
    expect(nextPrivateState).toEqual({ secret: 0 });
  });
});