export function validateGroupInput(payload) {
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  if (!name || name.length > 80) return 'Enter a group name of 1–80 characters.';
  if (!Array.isArray(payload.memberEmails) || !payload.memberEmails.length || payload.memberEmails.length > 500 ||
    payload.memberEmails.some(email => typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@codeace\.com$/i.test(email.trim()))) {
    return 'Select 1–500 company members.';
  }
  return null;
}

export async function handleGroupAction(supabase, user, action, payload) {
  const failure = message => ({ success: false, message });
  if (action === 'myGroups') {
    const { data, error } = await supabase.from('attendee_groups')
      .select('id, name, attendee_group_members(user_email)')
      .eq('owner_email', user.email).order('name');
    if (error) throw error;
    return { success: true, data: (data || []).map(row => ({
      id: row.id, name: row.name,
      memberEmails: (row.attendee_group_members || []).map(member => member.user_email),
    })) };
  }
  if (action !== 'createGroup' && (typeof payload.groupId !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.groupId))) {
    return failure('Group not found.');
  }
  if (action === 'deleteGroup') {
    const { data, error } = await supabase.from('attendee_groups').delete()
      .eq('id', payload.groupId).eq('owner_email', user.email).select('id');
    if (error) throw error;
    return data?.length ? { success: true, data: null } : failure('Group not found.');
  }
  const invalid = validateGroupInput(payload);
  if (invalid) return failure(invalid);
  const memberEmails = [...new Set(payload.memberEmails.map(email => email.trim().toLowerCase()))];
  const { data, error } = await supabase.rpc('save_attendee_group', {
    p_owner_email: user.email, p_name: payload.name.trim(), p_member_emails: memberEmails,
    p_group_id: action === 'updateGroup' ? payload.groupId : null,
  });
  if (error) throw error;
  return data?.ok ? { success: true, data: { id: data.id, name: payload.name.trim(), memberEmails } }
    : failure(data?.message || 'Unable to save group.');
}
