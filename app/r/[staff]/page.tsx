import { createClient } from '@supabase/supabase-js'
import { STAFF } from '@/lib/staff'
import { redirect } from 'next/navigation'

const GOOGLE_REVIEW_URL = process.env.NEXT_PUBLIC_GOOGLE_REVIEW_URL || 'https://g.page/r/YOUR_LINK/review'

export default async function RedirectPage({
  params,
}: {
  params: Promise<{ staff: string }>
}) {
  const { staff: staffId } = await params

  const validStaff = STAFF.find(s => s.id === staffId)

  // Log click to Supabase (server-side)
  if (validStaff) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.from('clicks').insert({ staff_id: staffId })
  }

  redirect(GOOGLE_REVIEW_URL)
}
