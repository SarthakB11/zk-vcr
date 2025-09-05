import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import * as fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// --- Type Definitions (from contract) ---
interface LabResults {
    cholesterol: bigint;
    bloodPressure: bigint;
    isSmoker: boolean;
}

interface VerifiableCredential {
    results: LabResults;
    signature: string; // hex
}

// --- Main Tool Logic ---

async function main() {
    const rli = createInterface({ input, output });

    console.log('--- ZK-VCR Issuer Tool ---');

    try {
        // 1. Get Issuer Secret Key
        const ownerSkHex = await rli.question('Enter the Issuer Secret Key (hex): ');
        const ownerSk = Buffer.from(ownerSkHex, 'hex');
        if (ownerSk.length !== 32) {
            throw new Error('Secret key must be 32 bytes (64 hex characters).');
        }

        // 2. Get Lab Results
        const cholesterolStr = await rli.question('Enter Cholesterol Level (e.g., 150): ');
        const bloodPressureStr = await rli.question('Enter Blood Pressure (e.g., 120): ');
        const isSmokerStr = await rli.question('Is the user a smoker? (true/false): ');

        const labResults: LabResults = {
            cholesterol: BigInt(cholesterolStr),
            bloodPressure: BigInt(bloodPressureStr),
            isSmoker: isSmokerStr.toLowerCase() === 'true',
        };

        // 3. Generate Signature and Public Key
        const { stdout } = await execAsync(
            `node src/hash-vc.mjs ${ownerSkHex} ${labResults.cholesterol} ${labResults.bloodPressure} ${labResults.isSmoker}`
        );
        const { publicKey, signature } = JSON.parse(stdout);

        // 4. Create Verifiable Credential
        const credential: VerifiableCredential = {
            results: labResults,
            signature: signature,
        };

        // 5. Save to file
        const outputPath = './credential.json';
        await fs.writeFile(outputPath, JSON.stringify(credential, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value, 2));

        console.log(`
Verifiable Credential saved to ${outputPath}`);
        console.log(`Issuer Public Key: ${publicKey}`);

    } catch (error) {
        console.error(`
Error: ${(error as Error).message}`);
    } finally {
        rli.close();
    }
}

main();
