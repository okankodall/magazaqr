import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'

const GOOGLE_REVIEW_URL = 'https://www.google.com/maps?cid=3751925013368003471&action=write-review'

export default async function RedirectPage({
  params,
}: {
  params: Promise<{ staff: string }>
}) {
  const { staff: staffId } = await params

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const now = new Date()
  const turkeyTime = new Date(now.getTime() + 3 * 60 * 60 * 1000)
  const today = turkeyTime.toISOString().split('T')[0]

  await supabase.from('clicks').insert({
    staff_id: staffId,
    clicked_at: now.toISOString(),
    date: today
  })

  redirect(GOOGLE_REVIEW_URL)
}
