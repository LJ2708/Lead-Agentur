import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendBeraterInviteEmail } from '@/lib/email/client'

function generateRandomPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%'
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => chars[byte % chars.length]).join('')
}

export async function POST(request: NextRequest) {
  try {
    // 1. Verify admin role via server client
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    // Parse body
    const body = await request.json() as { email?: string; full_name?: string; phone?: string }
    const { email, full_name, phone } = body

    if (!email || !full_name) {
      return NextResponse.json(
        { error: 'E-Mail und Name sind erforderlich' },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    // 2. Create auth user
    const { data: newUserData, error: createError } = await admin.auth.admin.createUser({
      email,
      email_confirm: false,
      password: generateRandomPassword(),
      user_metadata: { full_name, phone: phone || null },
    })

    if (createError || !newUserData.user) {
      console.error('[berater/invite] Fehler beim Erstellen des Benutzers:', createError?.message)
      return NextResponse.json(
        { error: createError?.message || 'Benutzer konnte nicht erstellt werden' },
        { status: 400 }
      )
    }

    const newUserId = newUserData.user.id

    // 3. Create profile record
    const { error: profileError } = await admin
      .from('profiles')
      .insert({
        id: newUserId,
        email,
        full_name,
        role: 'berater',
        phone: phone || null,
      })

    if (profileError) {
      console.error('[berater/invite] Fehler beim Erstellen des Profils:', profileError.message)
      // Clean up: remove auth user
      await admin.auth.admin.deleteUser(newUserId)
      return NextResponse.json(
        { error: 'Profil konnte nicht erstellt werden' },
        { status: 500 }
      )
    }

    // 4. Create berater record
    const { data: beraterData, error: beraterError } = await admin
      .from('berater')
      .insert({
        profile_id: newUserId,
        status: 'pending',
      })
      .select('id')
      .single()

    if (beraterError || !beraterData) {
      console.error('[berater/invite] Fehler beim Erstellen des Beraters:', beraterError?.message)
      // Clean up
      await admin.from('profiles').delete().eq('id', newUserId)
      await admin.auth.admin.deleteUser(newUserId)
      return NextResponse.json(
        { error: 'Berater-Eintrag konnte nicht erstellt werden' },
        { status: 500 }
      )
    }

    // 5. Generate invite link and send email
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'invite',
      email,
    })

    if (linkError) {
      console.error('[berater/invite] Fehler beim Generieren des Einladungslinks:', linkError.message)
    }

    const inviteUrl = linkData?.properties?.action_link || `${process.env.NEXT_PUBLIC_APP_URL || 'https://hub.leadsolution.de'}/auth/login`

    await sendBeraterInviteEmail(email, {
      name: full_name,
      inviteUrl,
    })

    // 6. Return success
    return NextResponse.json({
      success: true,
      berater_id: beraterData.id,
    })
  } catch (err) {
    console.error('[berater/invite] Unerwarteter Fehler:', err)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
