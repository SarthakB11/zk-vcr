### Academic & Industry Foundations

The concepts in this project are built upon foundational research in cryptography and decentralized identity. Our work is a practical implementation of the principles described in the following papers and standards:

1.  **Zero-Knowledge Proofs:**
    *   Parno, B., Gentry, C., Howell, J., & Raykova, M. (2016). *Pinocchio: Nearly practical verifiable computation*. Communications of the ACM, 59(2), 103-112. - A seminal paper on practical ZK-SNARKs, which form the basis of Midnight's technology.
2.  **Verifiable Credentials:**
    *   W3C. (2022). *Verifiable Credentials Data Model v1.1*. W3C Recommendation. - The official industry standard for the data model that our `credential.json` is based on. [Read the specification here](https://www.w3.org/TR/vc-data-model/).
3.  **The Oracle Problem:**
    *   Chainlink. *"What Is the Blockchain Oracle Problem?"*. - A comprehensive industry overview of the challenge of bringing real-world data onto the blockchain, which our project directly addresses. [Read the article here](https://chain.link/education/blockchain-oracles).
4.  **Articles:**
    *   **[The Cost of a Data Breach Report 2023](https://www.ibm.com/reports/data-breach)** - This annual report from IBM is the gold standard for quantifying the financial impact of data breaches. It consistently finds that the healthcare industry suffers the most expensive breaches, averaging **$10.93 million per incident**. This report provides the core economic justification for building systems like ZK-VCR.
    *   **[HCA Healthcare says data of 11 million patients stolen in breach](https://www.reuters.com/technology/hca-healthcare-says-data-11-mln-patients-stolen-2023-07-10/)** - A Reuters article detailing one of the largest healthcare breaches of 2023. This serves as a concrete example of the "Leaky Bucket" model in action, where a single, centralized entity becomes a massive target, exposing millions of sensitive patient records.
    *   **[23andMe says hackers stole ancestry data on 6.9 million users](https://techcrunch.com/2023/12/04/23andme-confirms-hackers-stole-ancestry-data-on-6-9-million-users/)** - This TechCrunch story highlights the new frontier of data privacy: genetic information. It underscores the danger of breaches involving immutable, lifelong data and demonstrates the need for privacy-preserving ways to use this data for research or personalized medicine.
    *   **[HIPAA Journal: November 2023 Healthcare Data Breach Report](https://www.hipaajournal.com/november-2023-healthcare-data-breach-report/)** - This report from the HIPAA Journal provides a sense of the alarming scale and frequency of the problem. It shows that dozens of breaches affecting millions of records occur *every single month*, proving that this is a systemic, ongoing failure, not an isolated event.
