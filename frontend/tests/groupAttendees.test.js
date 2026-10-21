import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeAttendees, availableGroupMembers } from '../src/utils/groupAttendees.ts';
test('overlapping groups merge with manual attendees and exclude organizer', () => {
  const manual = ['manual@codeace.com', 'a@codeace.com'];
  const first = mergeAttendees(manual, ['A@codeace.com', 'b@codeace.com', 'OWNER@codeace.com'], 'owner@codeace.com');
  const second = mergeAttendees(first, ['b@codeace.com', 'c@codeace.com'], 'owner@codeace.com');
  assert.deepEqual(second, ['manual@codeace.com', 'a@codeace.com', 'b@codeace.com', 'c@codeace.com']);
  assert.deepEqual(manual, ['manual@codeace.com', 'a@codeace.com']);
});
test('inactive members are skipped and empty groups are harmless', () => {
  assert.deepEqual(availableGroupMembers(['a@codeace.com', 'inactive@codeace.com', 'owner@codeace.com'], ['a@codeace.com', 'owner@codeace.com'], 'owner@codeace.com'), { emails: ['a@codeace.com'], skipped: 1 });
  assert.deepEqual(availableGroupMembers([], [], 'owner@codeace.com'), { emails: [], skipped: 0 });
});
test('booking attendees are a snapshot independent from later group edits', () => {
  const group = ['a@codeace.com', 'b@codeace.com'];
  const booking = mergeAttendees([], group, 'owner@codeace.com');
  group.push('c@codeace.com');
  assert.deepEqual(booking, ['a@codeace.com', 'b@codeace.com']);
  booking.splice(0, 1);
  assert.deepEqual(group, ['a@codeace.com', 'b@codeace.com', 'c@codeace.com']);
});
