/// <reference types="node" />
// Node built-in test-runner typings for this file only. tsconfig limits global
// types to vite/client so browser code cannot silently use Node globals.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateControlGuardrail,
  validateEmailInvite,
  validateRoomCsvLines,
  validateWorkOrderInput,
} from './validation';
import type { AutomationRule } from './types';

test('Email invite validation rejects invalid addresses and accepts valid ones', () => {
  assert.equal(validateEmailInvite('not-an-email', 'Technician').valid, false);
  assert.equal(validateEmailInvite('ops@meridianbio.example', 'Facilities Operator').valid, true);
});

test('Work order validation enforces required fields', () => {
  const bad = validateWorkOrderInput({ title: 'Fix', assetId: '', assignee: '', dueDate: '' });
  assert.equal(bad.valid, false);
  assert.ok(bad.errors.title);
  assert.ok(bad.errors.assetId);

  const ok = validateWorkOrderInput({
    title: 'Inspect Chiller CH-01 condenser valve',
    assetId: 'ast_ch01',
    assignee: 'Elena Rostova',
    dueDate: '2026-11-25',
  });
  assert.equal(ok.valid, true);
});

test('Room CSV parser reports duplicates and malformed rows cleanly', () => {
  const csv = [
    'code,name,areaSqm',
    'R-101,Main Atrium,240',
    'R-101,Duplicate Room,120',
    'R-102,Broken Area,abc',
    'R-103,Cleanroom Bay,185',
  ].join('\n');

  const res = validateRoomCsvLines(csv);
  assert.equal(res.accepted.length, 2);
  assert.equal(res.rejected.length, 2);
  assert.match(res.rejected[0].error ?? '', /Duplicate/);
});

test('Physical control guardrail blocks out-of-range setpoints and unapproved execution', () => {
  const rule: AutomationRule = {
    id: 'rule_1',
    tenantId: 'org_1',
    name: 'Chilled water reset',
    owner: 'Ops Lead',
    version: '1.2',
    enabled: true,
    scope: 'Meridian North Lab',
    triggerType: 'threshold',
    triggerCondition: 'OAT < 16C',
    actionType: 'request_control_change',
    requiresHumanApproval: true,
    rateCapPerHour: 2,
    loopGuardMaxDepth: 3,
    controlBounds: {
      allowListedPoint: 'CHW_SUPPLY_SP',
      minVal: 6.0,
      maxVal: 11.0,
      unit: '°C',
      maxRateOfChange: '0.5°C / 15m',
      expiryMinutes: 60,
    },
    lastRunAt: '2026-11-19T22:00:00Z',
    lastResult: 'held_for_approval',
  };

  const outOfRange = evaluateControlGuardrail(rule, 15.0, true);
  assert.equal(outOfRange.allowed, false);
  assert.equal(outOfRange.status, 'rejected_by_guardrail');

  const needsApproval = evaluateControlGuardrail(rule, 8.5, false);
  assert.equal(needsApproval.allowed, false);
  assert.equal(needsApproval.status, 'held_for_approval');

  const ok = evaluateControlGuardrail(rule, 8.5, true);
  assert.equal(ok.allowed, true);
  assert.equal(ok.status, 'approved_pending_ack');
});
