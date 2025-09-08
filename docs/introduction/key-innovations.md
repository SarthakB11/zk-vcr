### Key Innovations: A Stress-Tested Architecture

Our final design is the result of a rigorous process of identifying and solving critical security flaws.

*   **Problem:** "Garbage In, Garbage Out" - How do we know the user isn't lying about their health data?
    *   **Our Solution:** We use **Verifiable Credentials**. Our ZK circuit's first job is to verify the digital signature on the credential, ensuring the data is authentic and untampered with.

*   **Problem:** The "Oracle Problem" - How do we trust the real-world clinic that issues the credential?
    *   **Our Solution:** We use an **On-Chain Trusted Issuer Registry**. Our smart contract acts as a gatekeeper, only accepting proofs that originate from a clinic on its publicly governed list.

*   **Problem:** "Replay Attacks" - How do we stop a user from re-using an old, valid proof?
    *   **Our Solution:** We implement a **Nonce-based Challenge-Response Mechanism**. The smart contract issues a unique, single-use "challenge" for every transaction, which must be included in the proof, ensuring it is fresh and cannot be replayed.
