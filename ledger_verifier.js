const crypto = require('crypto');

class EnterpriseDocumentLedger {
    constructor(organizationName) {
        this.organization = organizationName;
        this.records = new Map();
    }

    /**
     * ডকুমেন্টের তথ্যের ওপর ভিত্তি করে একটি অপরিবর্তনীয় SHA-256 হ্যাশ তৈরি করে
     */
    generateDocumentHash(payload) {
        const normalizedData = JSON.stringify({
            refId: payload.refId,
            entity: payload.entity,
            beneficiary: payload.beneficiary,
            valuationBDT: payload.valuationBDT,
            timestamp: payload.timestamp
        });

        return crypto.createHash('sha256').update(normalizedData).digest('hex');
    }

    /**
     * লেজারে নতুন রেকর্ড নিবন্ধন করে
     */
    registerRecord(payload) {
        const timestamp = new Date().toISOString();
        const recordPayload = { ...payload, timestamp };
        const hash = this.generateDocumentHash(recordPayload);

        const entry = {
            ...recordPayload,
            cryptographicHash: hash,
            status: 'VERIFIED_IN_LEDGER'
        };

        this.records.set(payload.refId, entry);
        return entry;
    }

    /**
     * রেকর্ডের সত্যতা যাচাই (Audit) করে
     */
    verifyIntegrity(refId, currentData) {
        const storedRecord = this.records.get(refId);
        if (!storedRecord) {
            return { valid: false, reason: 'Record not found in ledger.' };
        }

        const recalculatedHash = this.generateDocumentHash({
            ...currentData,
            timestamp: storedRecord.timestamp
        });

        if (recalculatedHash === storedRecord.cryptographicHash) {
            return { valid: true, hash: recalculatedHash, verifiedAt: new Date().toISOString() };
        } else {
            return { valid: false, reason: 'Data tampering detected! Hash mismatch.' };
        }
    }
}

// --- ব্যবহারের বাস্তব উদাহরণ (Usage Example) ---
const salLedger = new EnterpriseDocumentLedger('Salsabilah Amin Limited');

const docData = {
    refId: 'SAL-MOU-2026-001',
    entity: 'Salsabilah Amin Limited',
    beneficiary: 'MD. AL AMIN SOHAG',
    valuationBDT: 20000000.00
};

// ১. রেকর্ড সংরক্ষণ
const saved = salLedger.registerRecord(docData);
console.log('Registered Record:', saved);

// ২. সত্যতা যাচাই (সঠিক তথ্য দিয়ে)
console.log('Audit Check 1:', salLedger.verifyIntegrity('SAL-MOU-2026-001', docData));

// ৩. কেউ যদি টাকার অংক পরিবর্তন করে যাচাই করার চেষ্টা করে
const tamperedData = { ...docData, valuationBDT: 50000000.00 };
console.log('Audit Check 2 (Tampered):', salLedger.verifyIntegrity('SAL-MOU-2026-001', tamperedData));
