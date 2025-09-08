### Getting Started: Download and Build the Project

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
