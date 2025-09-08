# ZK-VCR: A Step-by-Step Tutorial

Welcome to the ZK-VCR tutorial. This guide will walk you through the entire process of setting up, running, and understanding our "Privacy First" DApp.

### 1. Introduction: What is ZK-VCR?

ZK-VCR (Verifiable Credential Oracle) is a decentralized application that allows a user to prove they meet a specific health requirement (e.g., "low cardiovascular risk") to an on-chain smart contract, without revealing any of their underlying personal health information.

It achieves this by creating a "chain of trust" that combines the real-world authenticity of **Verifiable Credentials**, the mathematical integrity of **Zero-Knowledge Proofs**, and the transparent logic of an **on-chain AI model**.

Here is a high-level overview of the ZK-VCR architecture:

```mermaid
graph TD
    subgraph Real World
        A[Trusted Clinic] -- Signs Data --> B(Verifiable Credential .json);
    end

    subgraph User's Local Machine
        B -- Private Input --> C{ZK Circuit};
        D[Smart Contract] -- Challenge Nonce --> C;
        C -- Generates --> E(Anonymous ZK Proof);
    end

    subgraph Midnight Blockchain
        F[User's Wallet] -- Submits Proof --> D;
    end

    style A fill:#f9f,stroke:#333,stroke-width:2px
    style D fill:#bbf,stroke:#333,stroke-width:2px
```

<details>
<summary><strong>Click to expand: Understanding the Core Concepts & Our "Privacy First" Guarantee</strong></summary>

#### The "Privacy Firewall": Isolating the Point of Disclosure

The revolutionary idea here is not that your data is never seen by *anyone*. It's that we **control and isolate the point of disclosure** and prevent it from spreading any further.

*   **The World Today (The "Leaky Bucket" Model):** You go to a clinic, they have your data. You then send that data to your insurance company, to analytics services, and so on. Your data privacy is a leaky bucket, spilling out at every step.

*   **Our ZK-VCR Project (The "Airlock" Model):**
    1.  You go to a **single, trusted clinic**. This is the **one and only point of disclosure**, governed by real-world laws like doctor-patient confidentiality.
    2.  The clinic acts as a **Privacy Firewall**, translating your real-world health status into a secure, signed Verifiable Credential.
    3.  **The Airlock Shuts.** From this point forward, your data enters our purely private digital ecosystem. You use our DApp to generate a ZK proof.
    4.  The insurance company's smart contract **NEVER SEES YOUR DATA.** It only sees the anonymous proof. It learns only one single, binary fact: "This anonymous person qualifies for the discount."

Your data is secured from **everyone *except* the clinic you explicitly choose to trust.** We stop the uncontrolled spread of data across the internet.

</details>

---

### 2. Prerequisites & System Setup

Before running the project, you need to set up your development environment correctly.

<details>
<summary><strong>Click to expand: Detailed Step-by-Step Environment Setup Guide</strong></summary>

This is the "Golden Path" from a fresh start to a perfectly configured environment. Follow these instructions in order inside a WSL/Ubuntu terminal.

#### **Phase A: System Prerequisites**

Ensure the following are installed and running on your Windows machine:
1.  **WSL (Ubuntu):** The Windows Subsystem for Linux.
2.  **Docker Desktop:** Must be installed and running.

#### **Phase B: Configure the WSL/Ubuntu Environment**

1.  **Open a Fresh WSL Terminal:** Go to your Windows Start Menu, search for "Ubuntu" or "WSL", and open it.

2.  **Install Essential Tools:**
    ```bash
    sudo apt update
    sudo apt install -y git curl
    ```

3.  **Install NVM (Node Version Manager):**
    ```bash
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    ```

4.  ⚠️ **Important:** Close and Re-open Your WSL Terminal. This is required to activate NVM.

5.  **Install and Set Node.js:**
    ```bash
    nvm install 18
    nvm alias default 18
    ```
    Verify with `node --version`. It should show a v18.x.x version.

6.  **Install the Compact Compiler:**
    *   Using your **Windows browser**, download the latest **Linux** version from the [Midnight Testnet releases repository](https://github.com/Midnight-Network/testnet-releases/releases). It will be named `compactc-linux.zip`.
    *   **In your WSL terminal**, run the following commands. **Replace `<YourWindowsUsername>`** with your actual Windows username.
        ```bash
        # Create a permanent home for the compiler
        mkdir -p ~/my-binaries/compactc
        
        # Copy the downloaded file from Windows to WSL
        cp /mnt/c/Users/<YourWindowsUsername>/Downloads/compactc-linux.zip ~/my-binaries/compactc/
        
        # Unzip the compiler
        cd ~/my-binaries/compactc
        unzip compactc-linux.zip
        
        # Make it executable
        chmod +x compactc compactc.bin zkir
        ```

7.  **Add the Compiler to Your `PATH`:**
    *   Get the full path to your compiler by running `pwd` inside the `~/my-binaries/compactc` directory. Copy the output.
    *   Open your shell configuration file: `nano ~/.bashrc`
    *   Scroll to the very bottom and add these two lines, **pasting the path you just copied**:
        ```bash
        # Replace the path with your actual path from the pwd command
        export COMPACT_HOME='/home/YOUR_USERNAME/my-binaries/compactc'
        export PATH="$COMPACT_HOME:$PATH"
        ```
    *   Save and Exit (`Ctrl+O`, `Enter`, `Ctrl+X`).

8.  ⚠️ **Important:** Close and Re-open Your WSL Terminal.

9.  **Final Environment Check:** In your new terminal, run:
    ```bash
    compactc --version
    ```
    ✅ **Success!** You must see the compiler's version number. If you do, your environment is perfect.

</details>

---

### 3. Getting Started: Download and Build the Project

With your environment configured, you can now download and build ZK-VCR.

1.  ⌨️ **Your Action:** **Clone the Repository:**
    ```bash
    # Make sure you are in your home directory
    cd ~
    git clone https://github.com/SarthakB11/zk-vcr.git
    ```

2.  ⌨️ **Your Action:** **Navigate to the Project Directory:**
    ```bash
    cd zk-vcr
    ```

3.  ⌨️ **Your Action:** **Install All Dependencies:**
    ```bash
    npm install
    ```
    This command will install dependencies for all sub-projects (`contract`, `cli`, etc.).

4.  ⌨️ **Your Action:** **Compile the Smart Contract and ZK Circuit:**
    ```bash
    # Navigate to the contract directory
    cd contract
    
    # Compile the .compact files
    npm run compact && npm run build
    ```    ✅ **Success!** You should see the compiler output without any errors.

5.  ⌨️ **Your Action:** **Build the CLI Applications:**
    ```bash
    # Navigate to the CLI directory
    cd ../cli
    
    # Build the TypeScript code
    npm run build
    ```
    You are now ready to run the end-to-end demo.

---

### 4. Running the End-to-End Demo

![ZK-VCR Demo GIF](https://github.com/SarthakB11/zk-vcr/blob/main/demo.gif)

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

![Success Screenshot](https://github.com/SarthakB11/zk-vcr/blob/main/screenshot.png)

Congratulations! You have successfully run the entire ZK-VCR workflow, acting as all three participants in a secure, privacy-preserving ecosystem.

---

### 5. Troubleshooting

<details>
<summary><strong>Click to expand: Common Issues & Solutions</strong></summary>

*   **Error: `compactc: command not found`**
    *   **Cause:** The compiler is not in your shell's `PATH`.
    *   **Solution:** Make sure you have correctly edited your `~/.bashrc` file as described in the setup guide, and that you have **restarted your terminal** since making the change.

*   **Error: `Error: connect ECONNREFUSED 127.0.0.1:6300` in the CLI**
    *   **Cause:** The Midnight Proof Server is not running or is not accessible.
    *   **Solution:** Ensure that you have the Docker container running in a separate terminal (Step 1 of the demo). Check that Docker Desktop is running on your Windows machine.

*   **Error: `Proof verification failed` in the CLI**
    *   **Cause:** The on-chain and off-chain data do not match.
    *   **Solution:** Double-check that the **Issuer Public Key** you added to the smart contract is the *exact* same one that was used to sign the `credential.json` file.

</details>
