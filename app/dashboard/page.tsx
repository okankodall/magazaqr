'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { STAFF } from '@/lib/staff'
import QRCode from 'qrcode'

export default function Dashboard() {
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [qrUrls, setQrUrls] = useState<Record<string, string>>({})
  const [tab, setTab] = useState<'dashboard' | 'qr'>('dashboard')
  const [loading, setLoading] = useState(true)
  const [baseUrl, setBaseUrl] = useState('')

  useEffect(() => {
    setBaseUrl(window.location.origin)
    loadCounts()
    const interval = setInterval(loadCounts, 30000) // refresh every 30s
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!baseUrl) return
    generateQRCodes()
  }, [baseUrl])

  async function loadCounts() {
    const { data } = await supabase
      .from('clicks')
      .select('staff_id')

    if (data) {
      const c: Record<string, number> = {}
      STAFF.forEach(s => { c[s.id] = 0 })
      data.forEach(row => {
        if (c[row.staff_id] !== undefined) c[row.staff_id]++
        else c[row.staff_id] = 1
      })
      setCounts(c)
    }
    setLoading(false)
  }

  async function generateQRCodes() {
    const urls: Record<string, string> = {}
    for (const s of STAFF) {
      const url = `${baseUrl}/r/${s.id}`
      urls[s.id] = await QRCode.toDataURL(url, {
        width: 400,
        margin: 2,
        color: { dark: '#1a1a1a', light: '#ffffff' },
      })
    }
    setQrUrls(urls)
  }

  function downloadQR(staffId: string, name: string) {
    const a = document.createElement('a')
    a.href = qrUrls[staffId]
    a.download = `QR_${name}_Sephora.png`
    a.click()
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  const sorted = [...STAFF].sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0))

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <p className="text-[#C9A96E] tracking-widest text-sm">YÜKLENİYOR...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white pb-16">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1a0f05] via-[#2a1a08] to-[#1a0f05] border-b border-[#C9A96E33] px-6 py-5 flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-[#C9A96E] text-xs tracking-[6px] uppercase mb-1">Sephora Nişantaşı</p>
          <h1 className="text-xl font-bold tracking-wide">Google Yorum Takip Sistemi</h1>
        </div>
        <div className="bg-[#C9A96E22] border border-[#C9A96E55] rounded-xl px-5 py-3 text-center">
          <div className="text-3xl font-bold text-[#C9A96E]">{total}</div>
          <div className="text-[10px] text-[#a0896a] tracking-[3px] uppercase">Toplam Yönlendirme</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-6 pt-4 border-b border-[#2a2018]">
        {[
          { id: 'dashboard', label: '📊 Dashboard' },
          { id: 'qr', label: '📱 QR Kodlar' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as 'dashboard' | 'qr')}
            className={`px-5 py-2 rounded-t-lg text-sm transition-all ${
              tab === t.id
                ? 'bg-[#C9A96E] text-black font-bold'
                : 'text-[#a0896a] hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-6 pt-6">
        {/* DASHBOARD */}
        {tab === 'dashboard' && (
          <div className="space-y-3">
            {sorted.map((s, i) => {
              const count = counts[s.id] || 0
              const pct = total > 0 ? (count / total) * 100 : 0
              const medals = ['🥇', '🥈', '🥉', '4️⃣']
              return (
                <div
                  key={s.id}
                  className="rounded-xl p-5 flex items-center gap-4"
                  style={{
                    background: 'linear-gradient(90deg, #1a1410, #201a12)',
                    borderLeft: `3px solid ${s.color}`,
                    border: `1px solid ${s.color}22`,
                  }}
                >
                  <div className="text-2xl w-8 text-center">{medals[i]}</div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-base">{s.name}</span>
                      <span className="text-2xl font-bold" style={{ color: s.color }}>{count}</span>
                    </div>
                    <div className="bg-[#2a2018] rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${s.color}88, ${s.color})` }}
                      />
                    </div>
                    <p className="text-[10px] text-[#6a5a40] mt-1">%{pct.toFixed(1)} pay</p>
                  </div>
                </div>
              )
            })}

            <div className="mt-4 p-4 bg-[#1a1410] border border-[#2a2018] rounded-xl text-xs text-[#6a5a40] leading-relaxed">
              💡 <span className="text-[#a0896a] font-semibold">Otomatik takip:</span> Müşteri QR'ı okutunca sayaç otomatik artar. Her 30 saniyede bir güncellenir.
            </div>
          </div>
        )}

        {/* QR CODES */}
        {tab === 'qr' && (
          <div>
            <p className="text-xs text-[#a0896a] mb-4 bg-[#1a1410] border border-[#C9A96E33] rounded-lg px-4 py-3">
              📱 Her QR kodu tara → otomatik sayılır → Google Yorum sayfası açılır. PNG olarak indir, yazdır.
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {STAFF.map(s => (
                <div
                  key={s.id}
                  className="bg-white rounded-2xl p-4 text-center"
                  style={{ border: `3px solid ${s.color}`, boxShadow: `0 4px 20px ${s.color}44` }}
                >
                  <p className="text-black font-bold text-sm mb-1">{s.emoji} {s.name}</p>
                  <p className="text-gray-400 text-[9px] mb-3 tracking-widest">SEPHORA NİŞANTAŞI</p>
                  {qrUrls[s.id] ? (
                    <img src={qrUrls[s.id]} alt={`QR ${s.name}`} className="w-full rounded-lg border border-gray-100 mb-2" />
                  ) : (
                    <div className="w-full aspect-square bg-gray-100 rounded-lg mb-2 flex items-center justify-center text-gray-300 text-xs">
                      Yükleniyor...
                    </div>
                  )}
                  <p className="text-gray-500 text-[9px] mb-3">Google Yorum için tara</p>
                  <button
                    onClick={() => downloadQR(s.id, s.name)}
                    className="w-full text-white text-xs font-bold py-2 rounded-lg"
                    style={{ background: s.color }}
                  >
                    ⬇️ İndir
                  </button>
                  <div
                    className="mt-2 rounded-lg py-2 text-sm font-bold"
                    style={{ background: `${s.color}22`, color: s.color }}
                  >
                    {counts[s.id] || 0} tıklama
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
