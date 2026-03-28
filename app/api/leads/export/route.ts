import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStatusLabel } from '@/lib/utils'
import type { Database } from '@/types/database'

function escapeCSV(value: string | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes(';')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function formatDateCSV(dateStr: string | null): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d)
  } catch {
    return ''
  }
}

export async function GET(request: NextRequest) {
  try {
    // 1. Verify admin role
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

    // 2. Parse query params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'all'
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    // 3. Fetch leads with filters
    const admin = createAdminClient()

    let query = admin
      .from('leads')
      .select('*, berater:berater_id(id, profiles:profile_id(full_name))')
      .order('created_at', { ascending: false })

    if (status && status !== 'all' && status !== 'alle') {
      query = query.eq('status', status as Database['public']['Enums']['lead_status'])
    }

    if (from) {
      query = query.gte('created_at', new Date(from).toISOString())
    }

    if (to) {
      const endDate = new Date(to)
      endDate.setDate(endDate.getDate() + 1)
      query = query.lt('created_at', endDate.toISOString())
    }

    const { data: leads, error: leadsError } = await query

    if (leadsError) {
      console.error('[leads/export] Fehler:', leadsError.message)
      return NextResponse.json({ error: 'Leads konnten nicht geladen werden' }, { status: 500 })
    }

    // 4. Generate CSV
    const headers = [
      'ID',
      'Vorname',
      'Nachname',
      'Email',
      'Telefon',
      'Status',
      'Quelle',
      'Berater',
      'Zugewiesen am',
      'Erstellt am',
      'Kontaktversuche',
      'Erster Kontakt',
      'Termin',
      'Abschluss',
    ]

    const rows = (leads ?? []).map((lead) => {
      const berater = lead.berater as { id: string; profiles: { full_name: string | null } | null } | null
      const beraterName = berater?.profiles?.full_name || ''

      return [
        escapeCSV(lead.id),
        escapeCSV(lead.vorname),
        escapeCSV(lead.nachname),
        escapeCSV(lead.email),
        escapeCSV(lead.telefon),
        escapeCSV(getStatusLabel(lead.status)),
        escapeCSV(lead.source),
        escapeCSV(beraterName),
        escapeCSV(formatDateCSV(lead.zugewiesen_am)),
        escapeCSV(formatDateCSV(lead.created_at)),
        escapeCSV(String(lead.kontaktversuche ?? 0)),
        escapeCSV(formatDateCSV(lead.erster_kontakt_am)),
        escapeCSV(formatDateCSV(lead.termin_am)),
        escapeCSV(formatDateCSV(lead.abschluss_am)),
      ].join(',')
    })

    const csv = [headers.join(','), ...rows].join('\r\n')

    // 5. UTF-8 BOM for Excel compatibility
    const BOM = '\uFEFF'
    const csvWithBOM = BOM + csv

    const today = new Date().toISOString().slice(0, 10)

    return new NextResponse(csvWithBOM, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename=leads-export-${today}.csv`,
      },
    })
  } catch (err) {
    console.error('[leads/export] Unerwarteter Fehler:', err)
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 })
  }
}
