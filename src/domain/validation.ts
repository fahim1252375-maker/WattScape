import type { AutomationRule } from './types';

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateEmailInvite(email: string, role: string): ValidationResult {
  const errors: Record<string, string> = {};
  const trimmed = email.trim();
  if (!trimmed) {
    errors.email = 'Email address is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    errors.email = 'Enter a valid organizational email address.';
  }
  if (!role) {
    errors.role = 'Select an organization role.';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateWorkOrderInput(input: {
  title: string;
  assetId: string;
  assignee: string;
  dueDate: string;
}): ValidationResult {
  const errors: Record<string, string> = {};
  if (!input.title.trim() || input.title.trim().length < 5) {
    errors.title = 'Work order title must be at least 5 characters.';
  }
  if (!input.assetId.trim()) {
    errors.assetId = 'Select a target asset or meter.';
  }
  if (!input.assignee.trim()) {
    errors.assignee = 'Assign a technician or operations owner.';
  }
  if (!input.dueDate.trim()) {
    errors.dueDate = 'Provide a target due date.';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateRoomInput(input: {
  name: string;
  code: string;
  areaSqm: number;
}): ValidationResult {
  const errors: Record<string, string> = {};
  if (!input.name.trim()) {
    errors.name = 'Room name is required.';
  }
  if (!input.code.trim()) {
    errors.code = 'Room code is required.';
  }
  if (!Number.isFinite(input.areaSqm) || input.areaSqm <= 0 || input.areaSqm > 10000) {
    errors.areaSqm = 'Area must be between 1 and 10,000 m².';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export interface CsvImportRowResult {
  rowNumber: number;
  raw: string;
  valid: boolean;
  roomCode?: string;
  roomName?: string;
  areaSqm?: number;
  error?: string;
}

export function validateRoomCsvLines(csvText: string): {
  accepted: CsvImportRowResult[];
  rejected: CsvImportRowResult[];
} {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const seenCodes = new Set<string>();
  const accepted: CsvImportRowResult[] = [];
  const rejected: CsvImportRowResult[] = [];

  lines.forEach((line, idx) => {
    // Skip header row if detected
    if (idx === 0 && line.toLowerCase().includes('code') && line.toLowerCase().includes('name')) {
      return;
    }
    const parts = line.split(',').map((p) => p.trim());
    const rowNumber = idx + 1;
    if (parts.length < 3) {
      rejected.push({ rowNumber, raw: line, valid: false, error: 'Expected 3 columns: code,name,areaSqm' });
      return;
    }
    const [roomCode, roomName, areaStr] = parts;
    const areaSqm = Number(areaStr);
    if (!roomCode || !roomName) {
      rejected.push({ rowNumber, raw: line, valid: false, error: 'Missing room code or room name' });
      return;
    }
    if (seenCodes.has(roomCode.toUpperCase())) {
      rejected.push({ rowNumber, raw: line, valid: false, error: `Duplicate room code "${roomCode}"` });
      return;
    }
    if (!Number.isFinite(areaSqm) || areaSqm <= 0) {
      rejected.push({ rowNumber, raw: line, valid: false, error: `Invalid numeric area "${areaStr}"` });
      return;
    }
    seenCodes.add(roomCode.toUpperCase());
    accepted.push({ rowNumber, raw: line, valid: true, roomCode, roomName, areaSqm });
  });

  return { accepted, rejected };
}

/**
 * Policy guardrail evaluator for physical control requests (spec §3.10 & §11.1).
 */
export function evaluateControlGuardrail(
  rule: AutomationRule,
  proposedValue: number,
  userHasApprovalRole: boolean,
): { allowed: boolean; status: 'approved_pending_ack' | 'held_for_approval' | 'rejected_by_guardrail'; reason: string } {
  if (!rule.enabled) {
    return { allowed: false, status: 'rejected_by_guardrail', reason: 'Rule is disabled.' };
  }
  if (rule.actionType === 'request_control_change') {
    if (!rule.controlBounds) {
      return {
        allowed: false,
        status: 'rejected_by_guardrail',
        reason: 'Control request rejected: point is not on the integration allow-list.',
      };
    }
    if (proposedValue < rule.controlBounds.minVal || proposedValue > rule.controlBounds.maxVal) {
      return {
        allowed: false,
        status: 'rejected_by_guardrail',
        reason: `Proposed value ${proposedValue} ${rule.controlBounds.unit} violates safe bounds [${rule.controlBounds.minVal}, ${rule.controlBounds.maxVal}].`,
      };
    }
    if (rule.requiresHumanApproval && !userHasApprovalRole) {
      return {
        allowed: false,
        status: 'held_for_approval',
        reason: 'Physical actuation requires explicit operator/admin approval.',
      };
    }
  }
  return {
    allowed: true,
    status: 'approved_pending_ack',
    reason: 'Passed allow-list, range bounds, and approval policy.',
  };
}
