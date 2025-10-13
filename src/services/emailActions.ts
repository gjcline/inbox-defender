import { supabase } from '../lib/supabase';

export interface EmailActionResult {
  success: boolean;
  message: string;
}

export async function restoreEmail(
  emailId: string,
  userId: string,
  gmailMessageId: string,
  accessToken: string
): Promise<EmailActionResult> {
  try {
    const labelResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${gmailMessageId}/modify`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          addLabelIds: ['INBOX'],
          removeLabelIds: ['TRASH'],
        }),
      }
    );

    if (!labelResponse.ok) {
      throw new Error('Failed to restore email in Gmail');
    }

    const { error: updateError } = await supabase
      .from('emails')
      .update({
        classification: 'safe',
        action_taken: 'restored_to_inbox',
        label_applied: false,
      })
      .eq('id', emailId)
      .eq('user_id', userId);

    if (updateError) throw updateError;

    return { success: true, message: 'Email restored to inbox' };
  } catch (error) {
    console.error('Error restoring email:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to restore email',
    };
  }
}

export async function addToAllowlist(
  userId: string,
  emailAddress: string
): Promise<EmailActionResult> {
  try {
    const { error } = await supabase.from('allowlist').insert({
      user_id: userId,
      email_address: emailAddress,
    });

    if (error) {
      if (error.message.includes('duplicate')) {
        return { success: false, message: 'Email already in allowlist' };
      }
      throw error;
    }

    await supabase
      .from('emails')
      .update({ classification: 'safe' })
      .eq('user_id', userId)
      .eq('sender_email', emailAddress)
      .eq('classification', 'blocked');

    return { success: true, message: 'Added to allowlist' };
  } catch (error) {
    console.error('Error adding to allowlist:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to add to allowlist',
    };
  }
}

export async function reportFalsePositive(
  emailId: string,
  userId: string
): Promise<EmailActionResult> {
  try {
    const { error } = await supabase
      .from('emails')
      .update({
        classification: 'safe',
        ai_reasoning: 'Reported as false positive by user',
      })
      .eq('id', emailId)
      .eq('user_id', userId);

    if (error) throw error;

    return { success: true, message: 'Reported as false positive' };
  } catch (error) {
    console.error('Error reporting false positive:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to report',
    };
  }
}

export async function getAccessToken(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('gmail_connections')
      .select('access_token')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;
    return data?.access_token || null;
  } catch (error) {
    console.error('Error getting access token:', error);
    return null;
  }
}
