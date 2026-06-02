'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { STAFF as DEFAULT_STAFF } from '@/lib/staff'
import QRCode from 'qrcode'

type StaffMember = { id: string; name: string; emoji: string; color: string }
type DayStats = { date: string; counts: Record<string, number> }

const EMOJIS = ['🌟','💎','🔥','⚡','🎯','🌸','🦋','🏆','💫','🎪']

const SephoraLogo = ({ size = 28 }: { size?: number }) => (
  <svg width={size * 3.8} height={size} viewBox="0 0 145 38" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="145" height="38" fill="black"/>
    <text x="72" y="26" textAnchor="middle" fill="white" fontSize="17" fontFamily="Georgia, serif" fontWeight="bold" letterSpacing="7">SEPHORA</text>
  </svg>
)

function getTodayTurkey() {
  const now = new Date()
  const turkeyTime = new Date(now.getTime() + 3 * 60 * 60 * 1000)
  return turkeyTime.toISOString().split('T')[0]
}

function formatDate(d: string) {
  const [y, m, day] = d.split('-')
  return `${day}.${m}.${y}`
}

export default function Dashboard() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [todayCounts, setTodayCounts] = useState<Record<string, number>>({})
  const [dayStats, setDayStats] = useState<DayStats[]>([])
  const [qrUrls, setQrUrls] = useState<Record<string, string>>({})
  const [tab, setTab] = useState<'bugun' | 'gecmis' | 'qr' | 'ekle'>('bugun')
  const [loading, setLoading] = useState(true)
  const [baseUrl, setBaseUrl] = useState('')
  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState('🌟')
  const [toast, setToast] = useState('')

  useEffect(() => {
    setBaseUrl(window.location.origin)
    loadAll()
    const interval = setInterval(loadCounts, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!baseUrl || staff.length === 0) return
    generateQRCodes(staff)
  }, [baseUrl, staff])

  async function loadAll() {
    await loadStaff()
    await loadCounts()
    setLoading(false)
  }

  async function loadStaff() {
    const { data } = await supabase.from('staff').select('*').order('created_at', { ascending: true })
    if (data && data.length > 0) {
      setStaff(data)
    } else {
      for (const s of DEFAULT_STAFF) {
        await supabase.from('staff').upsert({ id: s.id, name: s.name, emoji: s.emoji, color: s.color })
      }
      setStaff(DEFAULT_STAFF)
    }
  }

  async function loadCounts() {
    const today = getTodayTurkey()
    const { data } = await supabase.from('clicks').select('staff_id, date')
    if (!data) return
    const tc: Record<string, number> = {}
    data.filter(r => r.date === today).forEach((r: { staff_id: string }) => {
      tc[r.staff_id] = (tc[r.staff_id] || 0) + 1
    })
    setTodayCounts(tc)
    const byDate: Record<string, Record<string, number>> = {}
    data.forEach((r: { staff_id: string; date: string }) => {
      if (!r.date) return
      if (!byDate[r.date]) byDate[r.date] = {}
      byDate[r.date][r.staff_id] = (byDate[r.date][r.staff_id] || 0) + 1
    })
    const stats = Object.entries(byDate)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, counts]) => ({ date, counts }))
    setDayStats(stats)
  }

  async function generateQRCodes(staffList: StaffMember[]) {
    const urls: Record<string, string> = {}
    for (const s of staffList) {
      const url = `${baseUrl}/r/${s.id}`
      const qrDataUrl = await QRCode.toDataURL(url, { width: 360, margin: 1, color: { dark: '#000000', light: '#ffffff' } })
      const canvas = document.createElement('canvas')
      const W = 400, H = 520
      canvas.width = W; canvas.height = H
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, 60)
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 22px Georgia, serif'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText('SEPHORA', W / 2, 30)
      ctx.fillStyle = '#aaaaaa'; ctx.font = '10px Arial'
      ctx.fillText('N I S A N T A S I', W / 2, 50)
      ctx.fillStyle = '#000'; ctx.font = 'bold 20px Arial'
      ctx.fillText(s.name, W / 2, 90)
      const img = new Image()
      await new Promise<void>(resolve => {
        img.onload = () => { ctx.drawImage(img, 20, 105, 360, 360); resolve() }
        img.src = qrDataUrl
      })
      const cx = W / 2, cy = 285
      const bw = s.name.length * 13 + 28, bh = 36
      ctx.fillStyle = '#fff'; ctx.fillRect(cx - bw/2, cy - bh/2, bw, bh)
      ctx.strokeStyle = '#000'; ctx.lineWidth = 2
      ctx.strokeRect(cx - bw/2, cy - bh/2, bw, bh)
      ctx.fillStyle = '#000'; ctx.font = 'bold 16px Arial'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(s.name, cx, cy)
      ctx.fillStyle = '#000'; ctx.fillRect(0, 468, W, 52)
      ctx.fillStyle = '#fff'; ctx.font = '11px Arial'
      ctx.fillText("Google'da yorum birakmak icin tara", W / 2, 484)
      ctx.fillStyle = '#aaa'; ctx.font = 'bold 10px Arial'
      ctx.fillText('NISANTASI SEPHORA', W / 2, 502)
      urls[s.id] = canvas.toDataURL('image/png')
    }
    setQrUrls(urls)
  }

  async function addStaff() {
    if (!newName.trim()) return
    const id = newName.toLowerCase()
      .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
      .replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c')
      .replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'')
    if (staff.find(s => s.id === id)) { showToast('Bu isim zaten var!'); return }
    const m = { id, name: newName.trim(), emoji: newEmoji, color: '#ffffff' }
    await supabase.from('staff').insert(m)
    setStaff([...staff, m])
    setNewName('')
    setTab('bugun')
    showToast(`${newName} eklendi! ✓`)
  }

  async function removeStaff(id: string) {
    if (!confirm('Bu calisani silmek istedigine emin misin?')) return
    await supabase.from('staff').delete().eq('id', id)
    setStaff(staff.filter(s => s.id !== id))
  }

  function downloadQR(staffId: string, name: string) {
    const a = document.createElement('a')
    a.href = qrUrls[staffId]
    a.download = `QR_${name}_Sephora.png`
    a.click()
  }

  function showToast(msg: string) {
    setToast(msg); setTimeout(() => setToast(''), 2500)
  }

  const todayTotal = Object.values(todayCounts).reduce((a, b) => a + b, 0)
  const sortedToday = [...staff].sort((a, b) => (todayCounts[b.id] || 0) - (todayCounts[a.id] || 0))

  if (loading) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
      <SephoraLogo size={32} />
      <p className="text-white tracking-widest text-xs mt-2">YUKLENIYOR...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-black text-white pb-16">
      <div className="bg-black border-b border-white px-6
