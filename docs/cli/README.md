# ZK-VCR Off-Chain CLI

This directory contains all the off-chain TypeScript code required to interact with the ZK-VCR smart contract. It includes two main applications: the primary user/admin CLI and a standalone tool for generating credentials.

## File Structure

-   `src/cli.ts`: The main entry point for the user-facing application. It handles all interactive prompts, menus, and orchestrates the high-level user flows.
-   `src/api.ts`: An abstraction layer that contains all the core logic for interacting with the Midnight network. It wraps the `MidnightJS` library calls for deploying contracts, submitting transactions, and querying state.
-   `src/generate-client.ts`: A standalone, user-friendly tool for trusted issuers (e.g., clinics). It prompts for a secret key and patient data, and generates a signed `credential.json` file.
-   `src/hash-vc.mjs`: A critical utility script that perfectly replicates the on-chain `persistentHash` function used in the smart contract. This ensures that signatures generated off-chain can be correctly verified on-chain.
-   `src/testnet-remote.ts`: The simple entry point that configures and runs the main CLI application against the public Midnight testnet.
-   `src/common-types.ts`: Contains shared TypeScript type definitions used across the CLI application.
-   `package.json`: Defines the project's dependencies and scripts, including `issuer-tool` and `start-testnet-remote`.

## Code Flow

The CLI operates on a stateful, menu-driven flow.

1.  **Wallet Setup:**
    -   On startup, the user is prompted to either create a fresh wallet or restore one from a seed. This wallet is used for paying transaction fees.

2.  **Main Menu (Role Selection):**
    -   The user must choose their role:
        -   **User:** For submitting a health proof.
        -   **Administrator:** For managing the DApp.

3.  **Administrator Flow:**
    -   The admin must first **Deploy** a new contract or **Join** an existing one.
    -   In either case, they are required to provide the **Contract Owner's Secret Key** to authenticate. This key is held in memory for the session.
    -   The admin can then perform protected actions like `addIssuer` or `revokeIssuer`. The stored secret key is used to sign these transactions, which is verified by the smart contract.

4.  **User Flow:**
    -   The user is prompted for the `contract address` they want to interact with.
    -   They provide the path to their `credential.json` file.
    -   The CLI automatically calls the `getChallenge` circuit on the smart contract to get a fresh nonce.
    -   It then constructs and submits the `submitHealthProof` transaction, providing the necessary data and the fetched challenge. The ZK proof is generated locally and sent with the transaction.

<details>
<summary><strong>Common CLI Errors</strong></summary>

*   **`Error: connect ECONNREFUSED 127.0.0.1:6300`**
    *   **Reason:** The CLI cannot connect to the Midnight Proof Server. This usually means the Docker container for the proof server is not running.

*   **`Error: Failed to join contract.`**
    *   **Reason:** The contract address you entered is invalid or does not exist on the network. This is typically caused by a typo.

*   **`Error: Could not find private state to update...`**
    *   **Reason:** A low-level error indicating that the CLI's local database for private state could not be accessed. This can sometimes happen if file permissions are incorrect.

*   **`Error: Secret key must be 32 bytes (64 hex characters).`**
    *   **Reason:** The secret key provided to the `issuer-tool` or the admin panel was not the correct length. All secret keys must be 32-byte hex strings.

</details>

## Development History

The CLI and off-chain tools were developed in iterative phases. You can review the pull requests for each phase to see how the code evolved:

*   **[Phase 3: Off-Chain Tooling](https://github.com/SarthakB11/zk-vcr/pull/2)**: Covers the development of the issuer tool and the initial user CLI.
*   **[Phase 4: Final UX & Security Hardening](https://github.com/SarthakB11/zk-vcr/pull/3)**: Details the final CLI enhancements, security fixes, and the implementation of the challenge-response mechanism.
