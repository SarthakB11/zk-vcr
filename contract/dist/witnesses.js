export const witnesses = {
    ownerSecretKey: ({ privateState }) => {
        return [privateState, privateState.secret];
    },
    userCredential: ({ privateState }) => {
        const cred = privateState.credential || {
            results: {
                cholesterol: 0n,
                bloodPressure: 0n,
                isSmoker: false,
            },
            signature: new Uint8Array(32),
        };
        return [privateState, cred];
    },
};
//# sourceMappingURL=witnesses.js.map