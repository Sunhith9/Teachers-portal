import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import twilio from 'twilio';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Authenticate the user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing notification ID' }, { status: 400 });
    }

    // Initialize Twilio
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const smsSender = process.env.TWILIO_PHONE_NUMBER;
    const whatsappSender = process.env.TWILIO_WHATSAPP_NUMBER || (smsSender ? `whatsapp:${smsSender}` : undefined);

    if (!accountSid || !authToken) {
      return NextResponse.json(
        { error: 'Twilio credentials missing. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in environment variables.' },
        { status: 500 }
      );
    }

    const client = twilio(accountSid, authToken);

    // Fetch pending notifications
    let notifications: any[] = [];
    if (id === 'all') {
      const { data, error } = await supabase
        .from('notifications')
        .select('*, students(parent_phone)')
        .eq('status', 'pending');

      if (error) throw error;
      notifications = data || [];
    } else {
      const { data, error } = await supabase
        .from('notifications')
        .select('*, students(parent_phone)')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) notifications = [data];
    }

    if (notifications.length === 0) {
      return NextResponse.json({ message: 'No pending notifications to send' });
    }

    const results = {
      success: 0,
      failed: 0,
      details: [] as { id: string; status: 'sent' | 'failed'; error?: string }[],
    };

    for (const notification of notifications) {
      try {
        const parentPhone = notification.students?.parent_phone;
        if (!parentPhone) {
          throw new Error('Parent phone number is not available for student.');
        }

        // Clean phone number (keep digits and +)
        const cleanPhone = parentPhone.replace(/[^\d+]/g, '');

        if (notification.channel === 'sms') {
          if (!smsSender) {
            throw new Error('TWILIO_PHONE_NUMBER is not configured for SMS sending.');
          }
          await client.messages.create({
            body: notification.message,
            from: smsSender,
            to: cleanPhone,
          });
        } else if (notification.channel === 'whatsapp') {
          if (!whatsappSender) {
            throw new Error('TWILIO_WHATSAPP_NUMBER or TWILIO_PHONE_NUMBER is not configured for WhatsApp.');
          }
          const formattedTo = cleanPhone.startsWith('whatsapp:') ? cleanPhone : `whatsapp:${cleanPhone}`;
          const formattedFrom = whatsappSender.startsWith('whatsapp:') ? whatsappSender : `whatsapp:${whatsappSender}`;

          await client.messages.create({
            body: notification.message,
            from: formattedFrom,
            to: formattedTo,
          });
        } else {
          throw new Error(`Unsupported channel: ${notification.channel}`);
        }

        // Update database status
        const { error: updateError } = await supabase
          .from('notifications')
          .update({ status: 'sent' })
          .eq('id', notification.id);

        if (updateError) throw updateError;

        results.success++;
        results.details.push({ id: notification.id, status: 'sent' });
      } catch (err: any) {
        console.error(`Error sending notification ${notification.id}:`, err);
        
        // Update status to failed in database
        await supabase
          .from('notifications')
          .update({ status: 'failed' })
          .eq('id', notification.id);

        results.failed++;
        results.details.push({ id: notification.id, status: 'failed', error: err.message || String(err) });
      }
    }

    const allSuccessful = results.failed === 0;
    if (!allSuccessful) {
      return NextResponse.json({
        message: `Processed ${notifications.length} notifications. Success: ${results.success}, Failed: ${results.failed}. Check logs or error details.`,
        results,
      }, { status: 207 }); // Multi-status
    }

    return NextResponse.json({
      message: `Processed ${notifications.length} notifications. Success: ${results.success}, Failed: ${results.failed}`,
      results,
    });
  } catch (error: any) {
    console.error('API Error in notifications/send:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
