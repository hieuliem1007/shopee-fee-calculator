import { Link } from 'react-router-dom'
import { LegalLayout } from './LegalLayout'

export function PrivacyPage() {
  return (
    <LegalLayout title="Chính sách bảo mật" subtitle="Cập nhật lần cuối: 29/04/2026">
      <Section title="1. Thông tin chúng tôi thu thập">
        <ul>
          <li>Thông tin tài khoản: email, tên hiển thị, ảnh đại diện (nếu cung cấp).</li>
          <li>
            Dữ liệu sử dụng: kết quả tính phí bạn lưu, thiết lập cá nhân, lịch
            sử truy cập tính năng.
          </li>
          <li>
            Cookie & analytics: Google Analytics 4 để đo lường lượt truy cập
            (không định danh cá nhân).
          </li>
        </ul>
      </Section>

      <Section title="2. Mục đích sử dụng">
        <ul>
          <li>Cung cấp và cải thiện dịch vụ.</li>
          <li>Lưu trữ kết quả tính cho bạn truy cập lại.</li>
          <li>Phân tích thống kê sử dụng để tối ưu sản phẩm.</li>
          <li>Liên hệ hỗ trợ khi cần.</li>
        </ul>
      </Section>

      <Section title="3. Chia sẻ thông tin">
        <ul>
          <li>
            Chúng tôi <strong>KHÔNG</strong> bán hoặc chia sẻ dữ liệu cá nhân
            của bạn cho bên thứ ba vì mục đích thương mại.
          </li>
          <li>
            Dữ liệu chỉ được chia sẻ với:
            <ul style={{ marginTop: 6 }}>
              <li>Nhà cung cấp hạ tầng (Supabase, Vercel) để vận hành dịch vụ</li>
              <li>Cơ quan chức năng khi có yêu cầu pháp lý</li>
            </ul>
          </li>
        </ul>
      </Section>

      <Section title="4. Bảo mật dữ liệu">
        <ul>
          <li>Mật khẩu được mã hóa bằng bcrypt, không lưu plaintext.</li>
          <li>Kết nối qua HTTPS.</li>
          <li>Truy cập dữ liệu cá nhân chỉ giới hạn cho admin được ủy quyền.</li>
        </ul>
      </Section>

      <Section title="5. Quyền của bạn">
        <ul>
          <li>Truy cập, chỉnh sửa, xóa dữ liệu cá nhân.</li>
          <li>Yêu cầu xóa tài khoản và dữ liệu liên quan qua Zalo.</li>
          <li>Tắt cookie analytics qua trình duyệt nếu muốn.</li>
        </ul>
      </Section>

      <Section title="6. Lưu trữ">
        <ul>
          <li>Dữ liệu được lưu tại Supabase region Singapore.</li>
          <li>
            Khi bạn xóa kết quả/tài khoản, dữ liệu được xóa khỏi database trong
            vòng 30 ngày.
          </li>
        </ul>
      </Section>

      <Section title="7. Liên hệ">
        <p>
          Liên hệ qua{' '}
          <a href="https://zalo.me/0901234567" target="_blank" rel="noopener noreferrer" style={linkStyle}>
            Zalo
          </a>
          . Website:{' '}
          <a href="https://edream.vn" target="_blank" rel="noopener noreferrer" style={linkStyle}>
            edream.vn
          </a>
          . Xem thêm{' '}
          <Link to="/terms" style={linkStyle}>Điều khoản sử dụng</Link>.
        </p>
      </Section>
    </LegalLayout>
  )
}

const linkStyle: React.CSSProperties = {
  color: '#1D9E75', textDecoration: 'underline', fontWeight: 500,
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 28 }}>
      <h2 style={{
        fontSize: 20, fontWeight: 700, color: '#1A1A1A',
        margin: '0 0 10px', letterSpacing: '-0.01em',
      }}>
        {title}
      </h2>
      <div style={{ fontSize: 16, color: '#3A3A35', lineHeight: 1.6 }}>
        {children}
      </div>
    </section>
  )
}
