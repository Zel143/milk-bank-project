import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import nodemailer from 'npm:nodemailer'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { recipientEmail, subject, body, triggerEvent, beneficiaryId, inquiryId } =
    await req.json() as {
      recipientEmail: string
      subject: string
      body: string
      triggerEvent: 'milk_available' | 'dispensing_confirmation' | 'status_update'
      beneficiaryId: string
      inquiryId?: string
    }

  const now = new Date().toISOString()
  let success = false
  let errorMessage: string | null = null

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: Deno.env.get('SMTP_USER'),
        pass: Deno.env.get('SMTP_PASS'),
      },
    })

    await transporter.sendMail({
      from: `Makati Human Milk Bank <${Deno.env.get('SMTP_USER')}>`,
      to: recipientEmail,
      subject,
      text: body,
    })

    success = true
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : 'SMTP error'
    console.error('Email send failed:', errorMessage)
  }

  await supabase.from('email_notifications').insert({
    beneficiary_id:  beneficiaryId,
    inquiry_id:      inquiryId ?? null,
    trigger_event:   triggerEvent,
    recipient_email: recipientEmail.toLowerCase(),
    subject,
    body,
    status:          success ? 'sent' : 'failed',
    queued_at:       now,
    sent_at:         success ? now : null,
    failed_at:       !success ? now : null,
    error_message:   errorMessage,
  })

  return new Response(
    JSON.stringify({ success, error: errorMessage }),
    {
      status: success ? 200 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  )
})
