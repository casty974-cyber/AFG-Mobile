
/* =========================================
   DATA & JOURNAL HUB
   ENCRYPTED OFFLINE DATABASE ENGINE
   ========================================= */

const HUB_DB_NAME = "DATA_JOURNAL_HUB_DB";
const HUB_DB_VERSION = 1;
const HUB_STORE = "records";
const HUB_CONFIG = "DJH_VAULT_CONFIG";

let hubDatabase = null;
let hubEncryptionKey = null;

/* ---------- DATABASE CONNECTION ---------- */

function openHubDatabase() {

    return new Promise((resolve, reject) => {

        const request = indexedDB.open(
            HUB_DB_NAME,
            HUB_DB_VERSION
        );

        request.onupgradeneeded = event => {

            const db = event.target.result;

            if (!db.objectStoreNames.contains(HUB_STORE)) {

                const store = db.createObjectStore(
                    HUB_STORE,
                    { keyPath: "id" }
                );

                store.createIndex(
                    "type",
                    "type",
                    { unique: false }
                );

                store.createIndex(
                    "updatedAt",
                    "updatedAt",
                    { unique: false }
                );
            }
        };

        request.onsuccess = () => {
            hubDatabase = request.result;
            resolve(hubDatabase);
        };

        request.onerror = () => {
            reject(request.error);
        };

    });
}

/* ---------- CRYPTOGRAPHIC UTILITIES ---------- */

function randomBytes(length) {

    const bytes = new Uint8Array(length);

    crypto.getRandomValues(bytes);

    return bytes;
}

function toBase64(bytes) {

    return btoa(
        Array.from(bytes)
        .map(byte => String.fromCharCode(byte))
        .join("")
    );
}

function fromBase64(value) {

    return Uint8Array.from(
        atob(value),
        char => char.charCodeAt(0)
    );
}

/* ---------- PIN KEY GENERATION ---------- */

async function deriveHubKey(pin, salt) {

    const encoder = new TextEncoder();

    const material = await crypto.subtle.importKey(
        "raw",
        encoder.encode(pin),
        "PBKDF2",
        false,
        ["deriveKey"]
    );

    return crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: 310000,
            hash: "SHA-256"
        },
        material,
        {
            name: "AES-GCM",
            length: 256
        },
        false,
        ["encrypt", "decrypt"]
    );
}


/* ---------- RECOVERY KEY UTILITIES ---------- */

async function deriveHubRecoveryKey(phrase, salt) {

    const normalizedPhrase = String(phrase)
        .trim()
        .toLowerCase();

    if (normalizedPhrase.length < 12) {
        throw new Error(
            "Recovery phrase must contain at least 12 characters."
        );
    }

    const material = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(normalizedPhrase),
        "PBKDF2",
        false,
        ["deriveKey"]
    );

    return crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: 310000,
            hash: "SHA-256"
        },
        material,
        {
            name: "AES-GCM",
            length: 256
        },
        false,
        ["encrypt", "decrypt"]
    );
}

/* ---------- MASTER ENCRYPTION KEY ---------- */

async function createHubMasterKey() {

    const rawKey = randomBytes(32);

    const key = await crypto.subtle.importKey(
        "raw",
        rawKey,
        {
            name: "AES-GCM",
            length: 256
        },
        true,
        ["encrypt", "decrypt"]
    );

    return {
        key: key,
        raw: rawKey
    };
}

async function importHubMasterKey(rawKey) {

    return crypto.subtle.importKey(
        "raw",
        rawKey,
        {
            name: "AES-GCM",
            length: 256
        },
        true,
        ["encrypt", "decrypt"]
    );
}

/* ---------- MASTER KEY WRAPPING ---------- */

async function wrapHubMasterKey(rawKey, protectionKey) {

    const iv = randomBytes(12);

    const encrypted = await crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv
        },
        protectionKey,
        rawKey
    );

    return {
        iv: toBase64(iv),
        ciphertext: toBase64(new Uint8Array(encrypted))
    };
}

async function unwrapHubMasterKey(wrapper, protectionKey) {

    return crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: fromBase64(wrapper.iv)
        },
        protectionKey,
        fromBase64(wrapper.ciphertext)
    );
}

/* ---------- ENABLE PIN & RECOVERY PROTECTION ---------- */

async function enableHubRecovery(currentPin, recoveryPhrase) {

    if (!hubEncryptionKey || !hubDatabase) {
        throw new Error("Unlock your workspace first.");
    }

    const phrase = String(recoveryPhrase || "")
        .trim()
        .toLowerCase();

    if (phrase.length < 12) {
        throw new Error(
            "Recovery phrase must contain at least 12 characters."
        );
    }

    const saved = localStorage.getItem(HUB_CONFIG);

    if (!saved) {
        throw new Error("Vault configuration not found.");
    }

    const oldConfig = JSON.parse(saved);

    if (oldConfig.version === 2) {
        throw new Error("Recovery is already configured.");
    }

    const oldKey = await deriveHubKey(
        currentPin,
        fromBase64(oldConfig.salt)
    );

    try {
        await crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: fromBase64(oldConfig.iv)
            },
            oldKey,
            fromBase64(oldConfig.verifier)
        );
    } catch {
        throw new Error("Your current PIN is incorrect.");
    }

    const oldRecords = await new Promise((resolve, reject) => {

        const transaction = hubDatabase.transaction(
            HUB_STORE,
            "readonly"
        );

        const request = transaction
            .objectStore(HUB_STORE)
            .getAll();

        request.onsuccess = () =>
            resolve(request.result || []);

        request.onerror = () =>
            reject(request.error);
    });

    const master = await createHubMasterKey();

    const pinSalt = randomBytes(16);
    const recoverySalt = randomBytes(16);

    const pinKey = await deriveHubKey(
        currentPin,
        pinSalt
    );

    const recoveryKey = await deriveHubRecoveryKey(
        phrase,
        recoverySalt
    );

    const pinWrapper = await wrapHubMasterKey(
        master.raw,
        pinKey
    );

    const recoveryWrapper = await wrapHubMasterKey(
        master.raw,
        recoveryKey
    );

    const newConfig = {
        version: 2,
        pin: {
            salt: toBase64(pinSalt),
            iv: pinWrapper.iv,
            ciphertext: pinWrapper.ciphertext
        },
        recovery: {
            salt: toBase64(recoverySalt),
            iv: recoveryWrapper.iv,
            ciphertext: recoveryWrapper.ciphertext
        }
    };

    const newRecords = [];

    for (const record of oldRecords) {

        const decrypted = await crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: fromBase64(record.iv)
            },
            oldKey,
            fromBase64(record.ciphertext)
        );

        const newIv = randomBytes(12);

        const encrypted = await crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv: newIv
            },
            master.key,
            decrypted
        );

        newRecords.push({
            ...record,
            iv: toBase64(newIv),
            ciphertext: toBase64(
                new Uint8Array(encrypted)
            )
        });
    }

    await new Promise((resolve, reject) => {

        const transaction = hubDatabase.transaction(
            HUB_STORE,
            "readwrite"
        );

        const store = transaction.objectStore(HUB_STORE);

        newRecords.forEach(record => store.put(record));

        transaction.oncomplete = resolve;

        transaction.onerror = () =>
            reject(transaction.error);

        transaction.onabort = () =>
            reject(transaction.error);
    });

    try {

        localStorage.setItem(
            HUB_CONFIG,
            JSON.stringify(newConfig)
        );

    } catch (error) {

        await new Promise((resolve, reject) => {

            const transaction = hubDatabase.transaction(
                HUB_STORE,
                "readwrite"
            );

            const store = transaction.objectStore(HUB_STORE);

            oldRecords.forEach(record => store.put(record));

            transaction.oncomplete = resolve;

            transaction.onerror = () =>
                reject(transaction.error);

            transaction.onabort = () =>
                reject(transaction.error);
        });

        throw error;
    }

    hubEncryptionKey = master.key;

    return true;
}


/* ---------- RECOVER FORGOTTEN PIN ---------- */

async function recoverHubVault(recoveryPhrase, newPin) {

    if (!/^\d{6,}$/.test(String(newPin))) {
        throw new Error("New PIN must contain at least 6 digits.");
    }

    const phrase = String(recoveryPhrase || "")
        .trim()
        .toLowerCase();

    if (phrase.length < 12) {
        throw new Error("Enter your complete recovery phrase.");
    }

    const saved = localStorage.getItem(HUB_CONFIG);

    if (!saved) {
        throw new Error("Vault configuration not found.");
    }

    const config = JSON.parse(saved);

    if (config.version !== 2 || !config.recovery) {
        throw new Error(
            "Recovery has not been configured for this vault."
        );
    }

    try {

        const recoveryKey = await deriveHubRecoveryKey(
            phrase,
            fromBase64(config.recovery.salt)
        );

        const rawMasterKey = await unwrapHubMasterKey(
            config.recovery,
            recoveryKey
        );

        const masterKey = await importHubMasterKey(
            new Uint8Array(rawMasterKey)
        );

        const newSalt = randomBytes(16);

        const newPinKey = await deriveHubKey(
            newPin,
            newSalt
        );

        const newWrapper = await wrapHubMasterKey(
            new Uint8Array(rawMasterKey),
            newPinKey
        );

        const updatedConfig = {
            ...config,
            pin: {
                salt: toBase64(newSalt),
                iv: newWrapper.iv,
                ciphertext: newWrapper.ciphertext
            }
        };

        localStorage.setItem(
            HUB_CONFIG,
            JSON.stringify(updatedConfig)
        );

        hubEncryptionKey = masterKey;

        await openHubDatabase();

        return true;

    } catch (error) {

        if (
            error.message === "Recovery has not been configured for this vault."
        ) {
            throw error;
        }

        throw new Error(
            "Recovery phrase is incorrect or recovery data is damaged."
        );
    }
}


/* ---------- ENCRYPTION ---------- */

async function encryptHubData(data) {

    if (!hubEncryptionKey) {
        throw new Error("Vault is locked.");
    }

    const iv = randomBytes(12);

    const encoded = new TextEncoder().encode(
        JSON.stringify(data)
    );

    const encrypted = await crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv
        },
        hubEncryptionKey,
        encoded
    );

    return {
        iv: toBase64(iv),
        ciphertext: toBase64(
            new Uint8Array(encrypted)
        )
    };
}

/* ---------- DECRYPTION ---------- */

async function decryptHubData(record) {

    if (!hubEncryptionKey) {
        throw new Error("Vault is locked.");
    }

    const decrypted = await crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: fromBase64(record.iv)
        },
        hubEncryptionKey,
        fromBase64(record.ciphertext)
    );

    return JSON.parse(
        new TextDecoder().decode(decrypted)
    );
}

/* ---------- FIRST-TIME VAULT SETUP ---------- */

async function setupHubVault(pin) {

    if (!/^\d{6,}$/.test(pin)) {
        throw new Error(
            "Use a PIN containing at least 6 digits."
        );
    }

    if (localStorage.getItem(HUB_CONFIG)) {
        throw new Error(
            "A vault already exists."
        );
    }

    if (!crypto.subtle) {
        throw new Error(
            "Secure cryptography unavailable. Open the app using a supported secure local origin."
        );
    }

    const salt = randomBytes(16);

    const key = await deriveHubKey(pin, salt);

    const iv = randomBytes(12);

    const verifier = await crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv
        },
        key,
        new TextEncoder().encode(
            "DATA_JOURNAL_HUB_VAULT_OK"
        )
    );

    const config = {
        version: 1,
        salt: toBase64(salt),
        iv: toBase64(iv),
        verifier: toBase64(
            new Uint8Array(verifier)
        )
    };

    localStorage.setItem(
        HUB_CONFIG,
        JSON.stringify(config)
    );

    hubEncryptionKey = key;

    await openHubDatabase();

    return true;
}


/* ---------- VAULT UNLOCK ---------- */

async function unlockHubVault(pin) {

    const saved = localStorage.getItem(HUB_CONFIG);

    if (!saved) {
        throw new Error("Vault has not been configured.");
    }

    const config = JSON.parse(saved);

    try {

        if (config.version === 2) {

            const pinKey = await deriveHubKey(
                pin,
                fromBase64(config.pin.salt)
            );

            const rawMasterKey = await unwrapHubMasterKey(
                config.pin,
                pinKey
            );

            hubEncryptionKey = await importHubMasterKey(
                new Uint8Array(rawMasterKey)
            );

        } else {

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
                throw new Error("Incorrect PIN.");
            }

            hubEncryptionKey = key;
        }

    } catch {

        throw new Error("Incorrect PIN.");
    }

    await openHubDatabase();

    return true;
}




/* ---------- CHANGE WORKSPACE PIN ---------- */

async function changeHubVaultPin(currentPin, newPin) {

    if (!hubEncryptionKey || !hubDatabase) {
        throw new Error("Unlock the vault first.");
    }

    if (!/^\d{6,}$/.test(newPin)) {
        throw new Error("New PIN must contain at least 6 digits.");
    }

    const saved = localStorage.getItem(HUB_CONFIG);

    if (!saved) {
        throw new Error("Vault configuration not found.");
    }

    const config = JSON.parse(saved);

    if (config.version === 2) {

        const oldPinKey = await deriveHubKey(
            currentPin,
            fromBase64(config.pin.salt)
        );

        let rawMasterKey;

        try {
            rawMasterKey = await unwrapHubMasterKey(
                config.pin,
                oldPinKey
            );
        } catch {
            throw new Error("Your current PIN is incorrect.");
        }

        const newSalt = randomBytes(16);

        const newPinKey = await deriveHubKey(
            newPin,
            newSalt
        );

        const newWrapper = await wrapHubMasterKey(
            new Uint8Array(rawMasterKey),
            newPinKey
        );

        const updatedConfig = {
            ...config,
            pin: {
                salt: toBase64(newSalt),
                iv: newWrapper.iv,
                ciphertext: newWrapper.ciphertext
            }
        };

        localStorage.setItem(
            HUB_CONFIG,
            JSON.stringify(updatedConfig)
        );

        return true;
    }

    /* Preserve the original version 1 PIN-change process. */

    const oldKey = await deriveHubKey(
        currentPin,
        fromBase64(config.salt)
    );

    try {
        await crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: fromBase64(config.iv)
            },
            oldKey,
            fromBase64(config.verifier)
        );
    } catch {
        throw new Error("Your current PIN is incorrect.");
    }

    const oldRecords = await new Promise((resolve, reject) => {

        const transaction = hubDatabase.transaction(
            HUB_STORE,
            "readonly"
        );

        const request = transaction
            .objectStore(HUB_STORE)
            .getAll();

        request.onsuccess = () =>
            resolve(request.result || []);

        request.onerror = () =>
            reject(request.error);
    });

    const newSalt = randomBytes(16);

    const newKey = await deriveHubKey(
        newPin,
        newSalt
    );

    const newIv = randomBytes(12);

    const newVerifier = await crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: newIv
        },
        newKey,
        new TextEncoder().encode(
            "DATA_JOURNAL_HUB_VAULT_OK"
        )
    );

    const newConfig = {
        version: 1,
        salt: toBase64(newSalt),
        iv: toBase64(newIv),
        verifier: toBase64(new Uint8Array(newVerifier))
    };

    const newRecords = [];

    for (const record of oldRecords) {

        const decrypted = await crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: fromBase64(record.iv)
            },
            oldKey,
            fromBase64(record.ciphertext)
        );

        const recordIv = randomBytes(12);

        const encrypted = await crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv: recordIv
            },
            newKey,
            decrypted
        );

        newRecords.push({
            ...record,
            iv: toBase64(recordIv),
            ciphertext: toBase64(new Uint8Array(encrypted))
        });
    }

    await new Promise((resolve, reject) => {

        const transaction = hubDatabase.transaction(
            HUB_STORE,
            "readwrite"
        );

        const store = transaction.objectStore(HUB_STORE);

        newRecords.forEach(record => store.put(record));

        transaction.oncomplete = resolve;

        transaction.onerror = () =>
            reject(transaction.error);

        transaction.onabort = () =>
            reject(transaction.error);
    });

    try {

        localStorage.setItem(
            HUB_CONFIG,
            JSON.stringify(newConfig)
        );

    } catch (error) {

        await new Promise((resolve, reject) => {

            const transaction = hubDatabase.transaction(
                HUB_STORE,
                "readwrite"
            );

            const store = transaction.objectStore(HUB_STORE);

            oldRecords.forEach(record => store.put(record));

            transaction.oncomplete = resolve;

            transaction.onerror = () =>
                reject(transaction.error);

            transaction.onabort = () =>
                reject(transaction.error);
        });

        throw error;
    }

    hubEncryptionKey = newKey;

    return true;
}



/* ---------- VAULT STATUS ---------- */

function isHubVaultConfigured() {

    return !!localStorage.getItem(HUB_CONFIG);
}

function isHubVaultUnlocked() {

    return !!hubEncryptionKey;
}

function lockHubVault() {

    hubEncryptionKey = null;

}

/* ---------- SAVE RECORD ---------- */

async function saveHubRecord(type, data, id = null) {

    if (!hubEncryptionKey || !hubDatabase) {
        throw new Error("Unlock the vault first.");
    }

    const now = new Date().toISOString();

    let existing = null;

    if (id) {
        existing = await getHubRawRecord(id);
    }

    const recordId = id || (
        crypto.randomUUID()
    );

    const encrypted = await encryptHubData(data);

    const record = {
        id: recordId,
        type: type,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
        iv: encrypted.iv,
        ciphertext: encrypted.ciphertext
    };

    return new Promise((resolve, reject) => {

        const transaction = hubDatabase.transaction(
            HUB_STORE,
            "readwrite"
        );

        transaction.objectStore(HUB_STORE).put(record);

        transaction.oncomplete = () => resolve(recordId);

        transaction.onerror = () => reject(transaction.error);

        transaction.onabort = () => reject(transaction.error);

    });
}

/* ---------- GET RAW RECORD ---------- */

function getHubRawRecord(id) {

    return new Promise((resolve, reject) => {

        const transaction = hubDatabase.transaction(
            HUB_STORE,
            "readonly"
        );

        const request = transaction
            .objectStore(HUB_STORE)
            .get(id);

        request.onsuccess = () => resolve(request.result || null);

        request.onerror = () => reject(request.error);

    });
}

/* ---------- READ ONE RECORD ---------- */

async function getHubRecord(id) {

    if (!hubEncryptionKey) {
        throw new Error("Vault is locked.");
    }

    const record = await getHubRawRecord(id);

    if (!record) return null;

    return {
        id: record.id,
        type: record.type,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        data: await decryptHubData(record)
    };
}

/* ---------- LIST RECORDS ---------- */


async function listHubRecords(type = null) {

    if (!hubEncryptionKey || !hubDatabase) {
        throw new Error("Unlock the vault first.");
    }

    const rawRecords = await new Promise((resolve, reject) => {

        const transaction = hubDatabase.transaction(
            HUB_STORE,
            "readonly"
        );

        const store = transaction.objectStore(HUB_STORE);

        const request = type
            ? store.index("type").getAll(type)
            : store.getAll();

        request.onsuccess = () => {
            resolve(request.result || []);
        };

        request.onerror = () => {
            reject(request.error);
        };

        transaction.onerror = () => {
            reject(transaction.error);
        };

    });

    const results = [];

    for (const record of rawRecords) {

        results.push({
            id: record.id,
            type: record.type,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
            data: await decryptHubData(record)
        });

    }

    results.sort((a, b) =>
        String(b.updatedAt || "").localeCompare(
            String(a.updatedAt || "")
        )
    );

    return results;
}


/* ---------- DELETE RECORD ---------- */

async function deleteHubRecord(id) {

    if (!hubEncryptionKey || !hubDatabase) {
        throw new Error("Unlock the vault first.");
    }

    return new Promise((resolve, reject) => {

        const transaction = hubDatabase.transaction(
            HUB_STORE,
            "readwrite"
        );

        transaction.objectStore(HUB_STORE).delete(id);

        transaction.oncomplete = () => resolve(true);

        transaction.onerror = () => reject(transaction.error);

    });
}

/* ---------- DATABASE INFORMATION ---------- */

async function getHubRecordCount() {

    if (!hubEncryptionKey || !hubDatabase) {
        throw new Error("Vault is locked.");
    }

    return new Promise((resolve, reject) => {

        const transaction = hubDatabase.transaction(
            HUB_STORE,
            "readonly"
        );

        const request = transaction
            .objectStore(HUB_STORE)
            .count();

        request.onsuccess = () => resolve(request.result);

        request.onerror = () => reject(request.error);

    });
}
