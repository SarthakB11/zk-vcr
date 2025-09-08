### Running the End-to-End Demo

[![Watch the ZK-VCR Demo]](https://github.com/user-attachments/assets/1b93a224-a133-44aa-903a-e9bb0911e9a8)

This process demonstrates the three distinct roles in our system: the **Issuer**, the **Administrator**, and the **User**. This requires **two separate WSL terminals**.

#### **Step 1: Start the Proof Server (Terminal 1)**

⚠️ **Important:** Do NOT close this terminal while the DApp is running.

1.  Open a **NEW** WSL terminal window.
2.  Run the Docker command to start the Midnight Proof Server:
    ```bash
    docker run -p 6300:6300 midnightnetwork/proof-server -- 'midnight-proof-server --network testnet'
    ```
3.  **Leave this terminal running.** It handles all the heavy cryptographic work.

#### **Step 2: The Issuer's Role: Generate a Credential (Terminal 2)**

Before a user can prove their health status, they must receive a signed credential from a trusted clinic. We simulate this with our `issuer-tool`.

1.  Go back to your **original** WSL terminal (it should be in the `/cli` directory).
2.  ⌨️ **Your Action:** Run the Issuer Tool:
    ```bash
    npm run issuer-tool
    ```
3.  Follow the interactive prompts:
    *   **Enter Clinic's Private Key:** This is a secret 32-byte key. You can use this example: `1122334455667788112233445566778811223344556677881122334455667788`
    *   **Enter Patient Data:** Provide health metrics. To test the "success" path, enter data that qualifies as "Low Risk" (e.g., Cholesterol: `150`, Blood Pressure: `120`, Smoker: `false`).
    *   **Enter Filename:** Name the output file `credential.json`.
4.  📝 **Note:**
    *   A `credential.json` file is created in the `/cli` directory. This is the Verifiable Credential.
    *   The tool will display the clinic's **Issuer Public Key**. **Copy this public key now**, you will need it in the next step.

#### **Step 3: The Admin & User Roles: Run the Main CLI (Terminal 2)**

Now we run the main application to deploy the contract and use the credential.

1.  ⌨️ **Your Action:** **Start the Main CLI:**
    ```bash
    npm run start-testnet-remote
    ```
2.  **Wallet Setup:** The CLI will start. Choose an option to set up your general-purpose wallet (e.g., **Option 2** to build from a seed). This wallet is for submitting transactions and paying fees.
3.  **The Administrator Flow:**
    *   At the main menu, select **Option 2 (DApp Administrator)**. This enters the secure admin panel.
    *   Choose **Option 1 (Deploy)** and provide a **secret key for the contract owner**. This key is the "master key" for your DApp.
    *   The contract will be deployed. 📝 **Note: Copy the new Contract Address.**
    *   Now, back in the admin menu, choose **Option 1 (Add an issuer)**.
    *   **Paste the Issuer Public Key** you copied from the Issuer Tool. This tells the smart contract to trust credentials signed by that clinic.
4.  **The User Flow:**
    *   Return to the main menu by choosing **Option 4**. Now, select **Option 1 (User)**.
    *   **Enter the Contract Address** you just copied from the deployment step.
    *   **Enter Credential Path:** `./credential.json`
    *   The CLI will automatically get a challenge from the contract, generate the ZK proof locally, and submit it.
5.  **Verification:**
    *   ✅ **Success!** You should see a "Verification Successful!" message.
    *   To be certain, you can go back to the **Administrator Flow** (you will need to re-enter the owner's secret key for authentication) and **Display the contract state**. You will see that the `usedNonces` map has been updated, providing on-chain evidence of your successful, private verification.

![Success Screenshot](https://github.com/user-attachments/assets/b2b240fc-232c-498e-b102-59129609ea19)

Congratulations! You have successfully run the entire ZK-VCR workflow, acting as all three participants in a secure, privacy-preserving ecosystem.
