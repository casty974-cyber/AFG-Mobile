
/* =========================================
   DATA & JOURNAL HUB
   ENCRYPTED BACKUP & RESTORE ENGINE
========================================= */

async function exportEncryptedBackup() {
    const status = document.getElementById("backupStatus");

    try {
        if (!isHubVaultUnlocked() || !hubDatabase) {
            throw new Error("Unlock your workspace first.");
        }

        const config = localStorage.getItem(HUB_CONFIG);

        if (!config) {
            throw new Error("Vault configuration not found.");
        }

        const records = await new Promise((resolve, reject) => {
            const transaction = hubDatabase.transaction(
                HUB_STORE,
                "readonly"
            );

            const request = transaction
                .objectStore(HUB_STORE)
                .getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });

        const backup = {
            app: "DATA_JOURNAL_HUB",
            formatVersion: 1,
            createdAt: new Date().toISOString(),
            vaultConfig: JSON.parse(config),
            records: records
        };

        const blob = new Blob(
            [JSON.stringify(backup)],
            { type: "application/json" }
        );

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download =
            "DATA_JOURNAL_HUB_BACKUP_" +
            new Date().toISOString().slice(0, 10) +
            ".djhbackup";

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);

        status.textContent =
            "Encrypted backup created successfully. Records: " +
            records.length;

    } catch (error) {
        console.error("Backup error:", error);

        status.textContent =
            "Backup failed: " + error.message;
    }
}


/* ---------- VERIFY BACKUP PIN ---------- */

async function verifyBackupPin(pin, config) {

    if (config.version === 2) {

        const pinKey = await deriveHubKey(
            pin,
            fromBase64(config.pin.salt)
        );

        const rawMasterKey = await unwrapHubMasterKey(
            config.pin,
            pinKey
        );

        return importHubMasterKey(
            new Uint8Array(rawMasterKey)
        );
    }

    const key = await deriveHubKey(
        pin,
        fromBase64(config.salt)
    );

    const result = await crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: fromBase64(config.iv)
        },
        key,
        fromBase64(config.verifier)
    );

    const message = new TextDecoder().decode(result);

    if (message !== "DATA_JOURNAL_HUB_VAULT_OK") {
        throw new Error("Incorrect backup PIN.");
    }

    return key;
}


/* ---------- RESTORE BACKUP ---------- */

async function importEncryptedBackup(event) {
    const status = document.getElementById("backupStatus");
    const file = event.target.files[0];

    if (!file) return;

    try {
        if (isHubVaultConfigured()) {
            throw new Error(
                "A vault already exists. Restore is only allowed into an installation without a configured vault."
            );
        }

        if (file.size > 100 * 1024 * 1024) {
            throw new Error("Backup file is larger than 100 MB.");
        }

        const backup = JSON.parse(await file.text());

        if (
            backup.app !== "DATA_JOURNAL_HUB" ||
            backup.formatVersion !== 1 ||
            !backup.vaultConfig ||
            !Array.isArray(backup.records)
        ) {
            throw new Error("Invalid backup file.");
        }

        const pin = prompt(
            "Enter the PIN used when this backup was created:"
        );

        if (pin === null) return;

        if (!/^\d{6,}$/.test(pin)) {
            throw new Error("Enter a valid backup PIN.");
        }

        const key = await verifyBackupPin(
            pin,
            backup.vaultConfig
        );

        const db = await openHubDatabase();

        await new Promise((resolve, reject) => {
            const transaction = db.transaction(
                HUB_STORE,
                "readwrite"
            );

            const store = transaction.objectStore(HUB_STORE);

            store.clear();

            for (const record of backup.records) {
                if (
                    !record ||
                    typeof record.id !== "string" ||
                    typeof record.type !== "string" ||
                    typeof record.iv !== "string" ||
                    typeof record.ciphertext !== "string"
                ) {
                    transaction.abort();
                    reject(new Error("Backup contains an invalid record."));
                    return;
                }

                store.put(record);
            }

            transaction.oncomplete = resolve;

            transaction.onerror = () =>
                reject(transaction.error);

            transaction.onabort = () =>
                reject(transaction.error || new Error("Restore cancelled."));
        });

        localStorage.setItem(
            HUB_CONFIG,
            JSON.stringify(backup.vaultConfig)
        );

        hubEncryptionKey = key;

        status.textContent =
            "Backup restored successfully. Records: " +
            backup.records.length +
            ". Reload the app to continue.";

        event.target.value = "";

    } catch (error) {
        console.error("Restore error:", error);

        status.textContent =
            "Restore failed: " + error.message;

        event.target.value = "";
    }
}
