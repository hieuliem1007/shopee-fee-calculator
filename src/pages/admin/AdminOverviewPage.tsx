import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Users, Clock, FileText, Tag, Link2, Activity,
  Loader2, AlertTriangle, RefreshCw, ArrowRight,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

// ── Types ────────────────────────────────────────────────────────

interface RecentActivity {
  id: string
  user_email: string | null
  action: string
  feature_id: string | null
  created_at: string
}

interface AdminOverview {
  total_users: number
  active_users: number
  pending_users: number
  rejected_users: number
  total_saved_results: number
  top_category: { slug: string; label: string; count: number } | null
  active_share_links: number
  recent_activity: RecentActivity[]
}

// ── Action label map (VN) ────────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
  'admin.approve_user':            'Duyệt user',
  'admin.reject_user':             'Từ chối user',
  'user.suspended':                'Tạm khóa user',
  'user.unsuspended':              'Bỏ tạm khóa user',
  'user.soft_deleted':             'Xóa user',
  'user.features_replaced':        'Thay đổi quyền user',
  'user.features_granted':         'Cấp quyền user',
  'user.features_revoked':         'Thu hồi quyền user',
  'user.profile_updated_by_admin': 'Admin cập nhật profile',
  'profile.self_updated':          'User tự cập nhật profile',
  'fee.created':                   'Tạo phí mới',
  'fee.updated':                   'Cập nhật phí',
  'fee.soft_deleted':              'Xóa phí',
  'category.bulk_imported':        'Nhập ngành hàng',
  'system_config.updated':         'Cập nhật cấu hình',
}

function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return 'vừa xong'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} phút trước`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} giờ trước`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day} ngày trước`
  const month = Math.floor(day / 30)
  if (month < 12) return `${month} tháng trước`
  return `${Math.floor(month / 12)} năm trước`
}

const fmtNum = new Intl.NumberFormat('vi-VN')

// ── KPI Card ─────────────────────────────────────────────────────

interface KpiCardProps {
  icon: ReactNode
  label: string
  value: ReactNode
  sub?: ReactNode
  accent?: string
  to?: string
}

function KpiCard({ icon, label, value, sub, accent = '#F5B81C', to }: KpiCardProps) {
  const inner = (
    <div style={{
      background: '#fff', border: '1px solid #EFEAE0', borderRadius: 12,
      padding: 18, display: 'flex', flexDirection: 'column', gap: 10,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      transition: 'border-color 0.15s, box-shadow 0.15s',
      cursor: to ? 'pointer' : 'default',
      height: '100%',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: `${accent}1A`, color: accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {icon}
        </div>
        {to && <ArrowRight size={14} color="#8A8A82" />}
      </div>
      <div style={{
        fontSize: 11, fontWeight: 600, color: '#8A8A82',
        letterSpacing: '0.06em', textTransform: 'uppercase',
      }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: '#1A1A1A', letterSpacing: '-0.02em' }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: '#6B6B66', lineHeight: 1.5 }}>
          {sub}
        </div>
      )}
    </div>
  )
  return to ? (
    <Link to={to} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
      {inner}
    </Link>
  ) : inner
}

// ── Page ─────────────────────────────────────────────────────────

export function AdminOverviewPage() {
  const [data, setData] = useState<AdminOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    const { data: rpc, error: rpcError } = await supabase.rpc('get_admin_overview')
    setLoading(false)
    if (rpcError) {
      setError(rpcError.message || 'Không thể tải số liệu')
      return
    }
    setData(rpc as AdminOverview)
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100 }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 24, gap: 16,
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: '#1A1A1A' }}>
            Tổng quan
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6B6B66' }}>
            Số liệu tóm tắt toàn hệ thống
          </p>
        </div>
        <button onClick={load} disabled={loading} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
          borderRadius: 8, border: '1px solid #EFEAE0', background: '#fff',
          fontSize: 13, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer',
          color: '#1A1A1A', fontFamily: 'inherit',
        }}>
          <RefreshCw size={14} style={loading ? { animation: 'spin 0.7s linear infinite' } : {}} />
          Làm mới
        </button>
      </div>

      {error ? (
        <div style={{
          background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B',
          padding: '14px 16px', borderRadius: 10, fontSize: 13,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <AlertTriangle size={16} /> {error}
        </div>
      ) : loading && !data ? (
        <div style={{ padding: '60px', textAlign: 'center' }}>
          <Loader2 size={28} color="#F5B81C" style={{ animation: 'spin 0.7s linear infinite' }} />
        </div>
      ) : data ? (
        <>
          {/* KPI grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 14,
            marginBottom: 18,
          }}>
            <KpiCard
              icon={<Users size={16} />}
              label="Tổng users"
              value={fmtNum.format(data.total_users)}
              sub={
                <>
                  <span style={{ color: '#1D9E75', fontWeight: 500 }}>{data.active_users} hoạt động</span>
                  {' · '}
                  <span style={{ color: data.pending_users > 0 ? '#D97706' : '#6B6B66', fontWeight: 500 }}>
                    {data.pending_users} chờ duyệt
                  </span>
                  {' · '}
                  <span>{data.rejected_users} từ chối</span>
                </>
              }
              accent="#1D9E75"
            />

            <KpiCard
              icon={<Clock size={16} />}
              label="Đang chờ duyệt"
              value={
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {fmtNum.format(data.pending_users)}
                  {data.pending_users > 0 && (
                    <span style={{
                      fontSize: 10, fontWeight: 600, color: '#fff', background: '#F59E0B',
                      padding: '2px 8px', borderRadius: 999, letterSpacing: '0.04em',
                    }}>MỚI</span>
                  )}
                </span>
              }
              sub={data.pending_users > 0 ? 'Click để xem danh sách' : 'Không có yêu cầu mới'}
              accent="#F59E0B"
              to="/admin/users/pending"
            />

            <KpiCard
              icon={<FileText size={16} />}
              label="Tổng kết quả đã lưu"
              value={fmtNum.format(data.total_saved_results)}
              sub="Bao gồm kết quả của tất cả user"
              accent="#3B82F6"
            />

            <KpiCard
              icon={<Tag size={16} />}
              label="Top ngành hàng"
              value={data.top_category?.label ?? '—'}
              sub={
                data.top_category
                  ? `${fmtNum.format(data.top_category.count)} kết quả đã lưu`
                  : 'Chưa có dữ liệu'
              }
              accent="#A855F7"
            />

            <KpiCard
              icon={<Link2 size={16} />}
              label="Share links đang hoạt động"
              value={fmtNum.format(data.active_share_links)}
              sub="Chưa hết hạn hoặc không có hạn"
              accent="#0EA5E9"
            />
          </div>

          {/* Recent activity (full width) */}
          <div style={{
            background: '#fff', border: '1px solid #EFEAE0', borderRadius: 12,
            overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <div style={{
              padding: '12px 18px', background: '#FAFAF7',
              borderBottom: '1px solid #EFEAE0',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Activity size={13} color="#8A8A82" />
                <span style={{
                  fontSize: 11, fontWeight: 600, color: '#8A8A82',
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                }}>
                  Hoạt động gần đây
                </span>
              </div>
              <Link to="/admin/activity-log" style={{
                fontSize: 12, fontWeight: 500, color: '#1A1A1A',
                textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4,
              }}>
                Xem tất cả <ArrowRight size={12} />
              </Link>
            </div>

            {data.recent_activity.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#8A8A82', fontSize: 13 }}>
                Chưa có hoạt động nào
              </div>
            ) : (
              <div>
                {data.recent_activity.map(row => (
                  <div key={row.id} style={{
                    padding: '12px 18px',
                    borderBottom: '1px solid #F5F2EA',
                    display: 'grid', gridTemplateColumns: '1fr auto', gap: 12,
                    alignItems: 'center',
                  }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: '#1A1A1A', fontWeight: 500 }}>
                        {actionLabel(row.action)}
                        {row.feature_id && (
                          <span style={{
                            marginLeft: 8, fontSize: 11, color: '#6B6B66',
                            background: '#F5F2EA', padding: '2px 8px', borderRadius: 999,
                          }}>
                            {row.feature_id}
                          </span>
                        )}
                      </div>
                      <div style={{
                        fontSize: 12, color: '#6B6B66', marginTop: 2,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {row.user_email ?? '— (user đã xóa)'}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: '#8A8A82', whiteSpace: 'nowrap' }}>
                      {relativeTime(row.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
