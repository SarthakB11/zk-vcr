# ZK-VCR CLI: Frequently Asked Questions & Troubleshooting

This guide provides solutions to common errors you might encounter while using the ZK-VCR command-line interface. Understanding these errors can help you diagnose issues with the smart contract, your local setup, or the data you are providing.

---

### 1. `failed assert: Caller is not the owner`

*   **❓ What it means:** You are trying to perform an action that is restricted to the DApp administrator (like adding or revoking a clinic), but you have not authenticated with the correct "master key" for the smart contract.

*   **🤔 Why it happens:** The smart contract has a security check to ensure that only the original deployer (the owner) can manage the list of trusted clinics. The secret key you provided in the administrator panel does not match the one associated with the owner's address stored on-chain.

*   **🔁 How to reproduce the error:**
    1.  Start the CLI and select **Option 2 (DApp Administrator)**.
    2.  Choose **Option 2 (Join an existing contract)** and enter a valid contract address.
    3.  When prompted for the `contract owner secret key`, deliberately enter a **wrong** 64-character hex key.
    4.  The CLI will let you in (as it can't verify the key until you try to make a change).
    5.  Choose **Option 1 (Add an issuer)**. The transaction will be sent, but the smart contract will reject it, and you will see this error.

*   **✅ How to fix it:** Ensure you are using the **exact same secret key** that was used when the contract was originally deployed. If you have lost the owner's secret key, you have lost administrative control of that specific contract instance and will need to deploy a new one.

---

### 2. `failed assert: Issuer key not found in registry`

*   **❓ What it means:** You are trying to submit a health proof as a user, but the credential you are using was signed by a clinic that the smart contract does not recognize as a trusted source.

*   **🤔 Why it happens:** The DApp administrator has not yet added the clinic's public key to the on-chain `trustedIssuers` list. The smart contract is correctly rejecting data from an unknown, untrusted source.

*   **🔁 How to reproduce the error:**
    1.  Use the `issuer-tool` to generate a new `credential.json` file and get a new clinic's public key.
    2.  As the **DApp Administrator**, deploy a new contract.
    3.  **Crucially, skip the "Add an issuer" step.**
    4.  Switch to the **User** flow and try to submit a proof using the `credential.json` you just created. The contract will not recognize the issuer's key, and the assertion will fail.

*   **✅ How to fix it:** The DApp administrator must use their owner key to log into the admin panel and call the `addIssuer` function, providing the public key of the clinic that signed the credential.

---

### 3. `failed assert: Challenge nonce has already been used`

*   **❓ What it means:** The proof you submitted is valid, but it uses a "challenge" nonce that has already been used in a previous successful transaction. This is the contract's replay protection working correctly.

*   **🤔 Why it happens:** Each proof must be tied to a unique, single-use challenge provided by the contract to prevent a malicious actor from intercepting a valid proof and re-submitting it.

*   **🔁 How to reproduce the error:** This error is difficult to reproduce with the current CLI because the `userFlow` is designed to *always* fetch a fresh challenge before submitting a proof. You would only encounter this if you were manually crafting transactions and deliberately re-used an old challenge value.

*   **✅ How to fix it:** No action is needed from the user. The CLI automatically handles getting a fresh challenge for every proof submission. This error signifies that the security system is working as intended.

---

### 4. `Error: connect ECONNREFUSED 127.0.0.1:6300`

*   **❓ What it means:** The ZK-VCR CLI cannot connect to the Midnight Proof Server.

*   **🤔 Why it happens:** The proof server, which runs in a Docker container, is either not running or is not accessible from your WSL terminal. This server is essential for handling the heavy cryptographic computations of ZK proof generation.

*   **🔁 How to reproduce the error:**
    1.  Ensure the proof server Docker container is **not** running.
    2.  Start the main CLI using `npm run start-testnet-remote`.
    3.  Attempt any action that requires generating a proof (like `submitHealthProof` or even `deploy`). The connection will fail, and this error will appear.

*   **✅ How to fix it:**
    1.  Make sure Docker Desktop is installed and running on your host machine.
    2.  In a separate terminal, run the command from the tutorial to start the proof server: `docker run -p 6300:6300 midnightnetwork/proof-server ...`
    3.  Leave this terminal running in the background while you use the main CLI.

---

### 5. `Error: Failed to join contract.`

*   **❓ What it means:** The CLI could not find a contract at the address you provided.

*   **🤔 Why it happens:** This is usually caused by a typo in the contract address or trying to connect to a contract that doesn't exist on the current network.

*   **🔁 How to reproduce the error:**
    1.  Start the CLI and enter the **User** or **Administrator** flow.
    2.  When prompted to enter a contract address, type in any random 64-character hex string that is not a real contract address.
    3.  The CLI will attempt to query the indexer for this address and will fail when it finds nothing.

*   **✅ How to fix it:** Carefully copy and paste the exact contract address that was output when the contract was deployed. Ensure there are no extra spaces or missing characters.
