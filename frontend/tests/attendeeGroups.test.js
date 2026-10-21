import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleGroupAction, validateGroupInput } from '../lib/attendeeGroups.js';
const user = { email: 'owner@codeace.com' };
const id = '00000000-0000-0000-0000-000000000001';
test('rejects invalid names, non-company emails, empty and excessive membership', () => {
  for (const payload of [ {}, { name: ' ', memberEmails: ['a@codeace.com'] },
    { name: 'x'.repeat(81), memberEmails: ['a@codeace.com'] },
    { name: 'Team', memberEmails: [] }, { name: 'Team', memberEmails: ['a@evil.com'] },
    { name: 'Team', memberEmails: [null] }, { name: 'Team', memberEmails: Array(501).fill('a@codeace.com') } ]) {
    assert.equal(typeof validateGroupInput(payload), 'string');
  }
});
test('create and update use authenticated owner and normalize duplicate emails', async () => {
  for (const action of ['createGroup', 'updateGroup']) {
    const db = { async rpc(fn, args) {
      assert.equal(fn, 'save_attendee_group');
      assert.equal(args.p_owner_email, user.email);
      assert.deepEqual(args.p_member_emails, ['a@codeace.com']);
      assert.equal(args.p_group_id, action === 'createGroup' ? null : id);
      return { data: { ok: true, id } };
    } };
    const result = await handleGroupAction(db, user, action, {
      name: ' Team ', memberEmails: [' A@codeace.com ', 'a@codeace.com'], groupId: id, owner_email: 'victim@codeace.com',
    });
    assert.equal(result.success, true);
    assert.deepEqual(result.data.memberEmails, ['a@codeace.com']);
  }
});
test('list and delete always constrain owner; unknown or foreign deletion fails', async () => {
  for (const action of ['myGroups', 'deleteGroup']) {
    const filters = [];
    const query = { select() { return this; }, delete() { return this; }, eq(key, value) { filters.push([key, value]); return this; },
      order() { return this; }, then(resolve) { resolve({ data: [] }); } };
    const result = await handleGroupAction({ from: () => query }, user, action, { groupId: id });
    assert.ok(filters.some(([key, value]) => key === 'owner_email' && value === user.email));
    assert.equal(result.success, action === 'myGroups');
  }
});
test('invalid ids are rejected before database access', async () => {
  for (const action of ['updateGroup', 'deleteGroup']) {
    assert.equal((await handleGroupAction({}, user, action, { groupId: 'injected' })).success, false);
  }
});
test('database validation failures do not report a successful save', async () => {
  const result = await handleGroupAction({ rpc: async () => ({ data: { ok: false, message: 'Group not found.' } }) }, user, 'updateGroup', {
    groupId: id, name: 'Team', memberEmails: ['a@codeace.com'],
  });
  assert.equal(result.success, false);
});
