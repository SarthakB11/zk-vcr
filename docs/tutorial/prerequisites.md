### Prerequisites & System Setup

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
