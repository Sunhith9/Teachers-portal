import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    // Initialize Meta WhatsApp Cloud API credentials
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const templateName = process.env.WHATSAPP_TEMPLATE_NAME;
    console.log('Template name being used:', templateName);

    if (!accessToken || !phoneNumberId) {
      return NextResponse.json(
        { error: 'Meta WhatsApp Cloud API credentials missing. Please set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in .env.local.' },
        { status: 500 }
      );
    }

    // Fetch pending notifications
    let notifications: any[] = [];
    if (id === 'all') {
      const { data, error } = await supabase
        .from('notifications')
        .select('*, students(parent_phone, full_name, gender, classes(name, section))')
        .eq('status', 'pending');

      if (error) throw error;
      notifications = data || [];
    } else {
      const { data, error } = await supabase
        .from('notifications')
        .select('*, students(parent_phone, full_name, gender, classes(name, section))')
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

    const url = `https://graph.facebook.com/v25.0/${phoneNumberId}/messages`;

    for (const notification of notifications) {
      try {
        const parentPhone = notification.students?.parent_phone;
        if (!parentPhone) {
          throw new Error('Parent phone number is not available for student.');
        }

        // Meta WhatsApp Cloud API expects recipient phone number with digits only (no +, spaces, or dashes)
        const cleanPhone = parentPhone.replace(/\D/g, '');

        const relation = notification.students?.gender === 'male' ? 'son' : notification.students?.gender === 'female' ? 'daughter' : 'child';
        const studentName = notification.students?.full_name || 'your child';
        const className = notification.students?.classes ? `${notification.students.classes.name}-${notification.students.classes.section}` : '';
        const notificationDate = new Date(notification.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

        let payload: any;

        if (templateName) {
          if (templateName === 'hello_world') {
            // Send default Meta testing template (does not accept variables)
            payload = {
              messaging_product: 'whatsapp',
              recipient_type: 'individual',
              to: cleanPhone,
              type: 'template',
              template: {
                name: 'hello_world',
                language: {
                  code: 'en_US',
                },
              },
            };
          } else {
            // Send custom template with variables
            payload = {
              messaging_product: 'whatsapp',
              recipient_type: 'individual',
              to: cleanPhone,
              type: 'template',
              template: {
                name: templateName,
                language: {
                  code: 'en',
                },
                components: [
                  {
                    type: 'body',
                    parameters: [
                      { type: 'text', text: relation },
                      { type: 'text', text: studentName },
                      { type: 'text', text: notificationDate },
                      { type: 'text', text: className },
                    ],
                  },
                ],
              },
            };
          }
        } else {
          // Send as a Free-form Text Message (Works in Sandbox if receiver messaged the bot in last 24h)
          payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: cleanPhone,
            type: 'text',
            text: {
              body: notification.message,
            },
          };
        }

        console.log('Sending to phone number:', cleanPhone);

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const responseData = await response.json();

        if (!response.ok) {
          console.error('Full Meta API Error Response:', JSON.stringify(responseData, null, 2));
          throw new Error(responseData.error?.message || 'Failed to send message via Meta API');
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
      }, { status: 207 });
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
