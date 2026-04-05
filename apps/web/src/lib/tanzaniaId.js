/** Tanzania government ID types (stored in tenants.id_type). */
export const TZ_ID_TYPE_OPTIONS = [
  { value: 'nida', label: 'NIDA — National ID (NIN)', numberLabel: 'NIDA ID No.' },
  { value: 'passport_tz', label: 'Passport — Tanzania', numberLabel: 'Passport number' },
  { value: 'driving_license', label: 'Driving licence — Tanzania (TDL)', numberLabel: 'Driving licence number' },
  { value: 'voter_id_nec', label: 'Voter ID — NEC', numberLabel: 'Voter ID number' },
  { value: 'tin_tra', label: 'TIN — TRA (Tax Identification Number)', numberLabel: 'TIN (TRA)' },
  { value: 'zanzibar_id', label: 'Zanzibar ID', numberLabel: 'Zanzibar ID number' },
  { value: 'birth_certificate', label: 'Birth certificate', numberLabel: 'Birth certificate number' },
  { value: 'refugee_id', label: 'Refugee ID', numberLabel: 'Refugee ID number' },
  { value: 'residence_permit', label: 'Residence / work permit', numberLabel: 'Permit / reference number' },
  { value: 'other', label: 'Other government-issued ID', numberLabel: 'ID / document number' },
];

const LABEL_BY_TYPE = Object.fromEntries(
  TZ_ID_TYPE_OPTIONS.map((o) => [o.value, o.label])
);

const NUMBER_LABEL_BY_TYPE = Object.fromEntries(
  TZ_ID_TYPE_OPTIONS.map((o) => [o.value, o.numberLabel])
);

/** Tanzania NIN (NIDA) is 20 numeric digits (no letters). */
export const NIDA_DIGIT_COUNT = 20;

export function normalizeNidaDigits(value) {
  return String(value ?? '').replace(/\D/g, '');
}

export function isValidNidaFormat(value) {
  const d = normalizeNidaDigits(value);
  return d.length === NIDA_DIGIT_COUNT;
}

export function getIdTypeLabel(value) {
  if (!value) return '—';
  return LABEL_BY_TYPE[value] || value;
}

/** Label for the ID number field — changes with selected id type. */
export function getIdNumberFieldLabel(idType) {
  if (!idType) return 'ID number';
  return NUMBER_LABEL_BY_TYPE[idType] || 'ID number';
}

/** Short hint under the input (optional). */
export function getIdNumberHint(idType) {
  switch (idType) {
    case 'nida':
      return `NIDA (NIN) ni nambari ${NIDA_DIGIT_COUNT} za tarakimu pekee / ${NIDA_DIGIT_COUNT} digits only`;
    case 'tin_tra':
      return 'TIN ya TRA ni tarakimu 9 / TRA TIN is 9 digits';
    case 'passport_tz':
      return 'Nambari ya pasipoti (herufi na nambari, 6–20) / Passport no. (6–20 alphanumeric)';
    case 'driving_license':
      return 'Nambari ya leseni (6–20) / Licence number (6–20 alphanumeric)';
    case 'voter_id_nec':
      return 'Nambari ya mpiga kura / Voter ID (5–40 characters)';
    case 'zanzibar_id':
    case 'refugee_id':
    case 'residence_permit':
      return 'Ingiza nambari ya hati / Enter document number (5–40 characters)';
    case 'birth_certificate':
      return 'Nambari ya cheti cha kuzaliwa / Birth certificate no. (5–40 characters)';
    case 'other':
      return 'Nambari ya kitambulisho / Document reference (3–80 characters)';
    default:
      return null;
  }
}

/** Max length for the ID number input (controlled typing). */
export function getMaxIdNumberLength(idType) {
  if (idType === 'nida') return NIDA_DIGIT_COUNT;
  if (idType === 'tin_tra') return 9;
  return 200;
}

/** TRA TIN digit count (common Tanzania format). */
export const TIN_DIGIT_COUNT = 9;

/** Placeholder text for the ID number input. */
export function getIdNumberPlaceholder(idType) {
  switch (idType) {
    case 'nida':
      return 'Enter 20-digit NIDA number';
    case 'tin_tra':
      return '9-digit TRA TIN';
    case 'passport_tz':
      return 'e.g. A1234567';
    case 'driving_license':
      return 'e.g. T123456789';
    case 'voter_id_nec':
      return 'Voter ID number';
    case 'zanzibar_id':
      return 'Zanzibar ID number';
    case 'birth_certificate':
      return 'Certificate number';
    case 'refugee_id':
      return 'Refugee ID number';
    case 'residence_permit':
      return 'Permit reference';
    case 'other':
      return 'Document number';
    default:
      return 'Select ID type first';
  }
}

function validateTinTra(trimmed) {
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length !== 9) {
    return {
      field: 'id_number',
      message:
        'TIN lazima iwe nambari 9 za TRA (tarakimu pekee) / TIN must be exactly 9 digits (TRA)',
    };
  }
  return null;
}

/** Passport / driving licence: letters and digits, 6–20 after removing spaces. */
function validateAlphanumericDoc(trimmed, swahiliName) {
  const c = trimmed.replace(/\s/g, '');
  if (!/^[A-Za-z0-9]{6,20}$/.test(c)) {
    return {
      field: 'id_number',
      message: `${swahiliName}: herufi na nambari 6–20 / Use 6–20 letters or digits`,
    };
  }
  return null;
}

/** Voter, Zanzibar, refugee, permit: reference 5–40 chars. */
function validateMediumRef(trimmed) {
  if (trimmed.length < 5 || trimmed.length > 40) {
    return {
      field: 'id_number',
      message: 'Ingiza nambari 5–40 / Enter 5–40 characters',
    };
  }
  return null;
}

function validateBirthCert(trimmed) {
  if (trimmed.length < 5 || trimmed.length > 40) {
    return {
      field: 'id_number',
      message: 'Ingiza nambari 5–40 / Enter 5–40 characters',
    };
  }
  return null;
}

function validateOther(trimmed) {
  if (trimmed.length < 3 || trimmed.length > 80) {
    return {
      field: 'id_number',
      message: 'Ingiza nambari 3–80 / Enter 3–80 characters',
    };
  }
  return null;
}

/** Returns `{ field, message }` or `null` if valid / both empty. */
export function validateTenantIdFields(idType, idNumber) {
  const trimmed = String(idNumber ?? '').trim();
  if (!idType && trimmed) {
    return {
      field: 'id_type',
      message: 'Chagua aina ya kitambulisho / Select ID type',
    };
  }
  if (!idType && !trimmed) return null;
  if (idType && !trimmed) {
    return {
      field: 'id_number',
      message: 'Ingiza namba ya kitambulisho / Enter ID number',
    };
  }

  if (idType === 'nida') {
    const d = normalizeNidaDigits(trimmed);
    if (d.length !== NIDA_DIGIT_COUNT) {
      return {
        field: 'id_number',
        message: `NIDA lazima iwe nambari ${NIDA_DIGIT_COUNT} tu (tarakimu pekee) / NIDA must be exactly ${NIDA_DIGIT_COUNT} digits`,
      };
    }
    return null;
  }

  if (idType === 'tin_tra') {
    const err = validateTinTra(trimmed);
    if (err) return err;
    return null;
  }

  if (idType === 'passport_tz') {
    return validateAlphanumericDoc(trimmed, 'Pasipoti');
  }
  if (idType === 'driving_license') {
    return validateAlphanumericDoc(trimmed, 'Leseni');
  }

  if (idType === 'voter_id_nec' || idType === 'zanzibar_id' || idType === 'refugee_id' || idType === 'residence_permit') {
    return validateMediumRef(trimmed);
  }

  if (idType === 'birth_certificate') {
    return validateBirthCert(trimmed);
  }

  if (idType === 'other') {
    return validateOther(trimmed);
  }

  if (trimmed.length > 200) {
    return { field: 'id_number', message: 'ID number is too long' };
  }
  return null;
}
