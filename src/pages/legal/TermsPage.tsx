import { Link } from 'react-router-dom'
import { LegalLayout } from './LegalLayout'

export function TermsPage() {
  return (
    <LegalLayout title="Điều khoản sử dụng" subtitle="Cập nhật lần cuối: 29/04/2026">
      <Section title="1. Giới thiệu">
        <p>
          E-Dream Tools là công cụ tính phí và phân tích lợi nhuận dành cho người
          bán Shopee. Bằng việc sử dụng dịch vụ, bạn đồng ý với các điều khoản
          dưới đây.
        </p>
      </Section>

      <Section title="2. Tài khoản">
        <ul>
          <li>Bạn cần đăng ký tài khoản với email hợp lệ để sử dụng các tính năng nâng cao.</li>
          <li>Bạn chịu trách nhiệm bảo mật thông tin đăng nhập và mọi hoạt động dưới tài khoản của mình.</li>
          <li>Tài khoản phải được phê duyệt bởi quản trị viên trước khi truy cập đầy đủ tính năng.</li>
        </ul>
      </Section>

      <Section title="3. Sử dụng dịch vụ">
        <ul>
          <li>
            Công cụ tính phí dựa trên dữ liệu công khai của Shopee tại thời điểm
            cập nhật. Tỷ lệ phí thực tế có thể thay đổi theo chính sách của Shopee.
          </li>
          <li>
            Kết quả tính toán mang tính tham khảo, không phải con số chính thức
            từ Shopee. E-Dream Tools không chịu trách nhiệm về thiệt hại phát
            sinh do sai lệch số liệu.
          </li>
          <li>
            Bạn không được sử dụng dịch vụ để: phá hoại hệ thống, thu thập dữ
            liệu trái phép, vi phạm pháp luật Việt Nam.
          </li>
        </ul>
      </Section>

      <Section title="4. Quyền sở hữu">
        <ul>
          <li>Toàn bộ nội dung, mã nguồn, giao diện thuộc sở hữu của E-Dream.</li>
          <li>
            Dữ liệu bạn nhập vào (giá vốn, giá bán, kết quả tính) thuộc về bạn.
            Chúng tôi chỉ lưu trữ để phục vụ bạn truy cập lại.
          </li>
        </ul>
      </Section>

      <Section title="5. Thanh toán & nâng cấp">
        <ul>
          <li>
            Một số tính năng yêu cầu nâng cấp tài khoản. Việc nâng cấp được xử
            lý thủ công qua Zalo.
          </li>
          <li>Phí nâng cấp không hoàn lại trừ trường hợp lỗi kỹ thuật từ E-Dream.</li>
        </ul>
      </Section>

      <Section title="6. Chấm dứt dịch vụ">
        <p>
          E-Dream có quyền tạm ngừng hoặc xóa tài khoản nếu bạn vi phạm điều
          khoản. Bạn có thể yêu cầu xóa tài khoản bất kỳ lúc nào qua Zalo.
        </p>
      </Section>

      <Section title="7. Liên hệ">
        <p>
          Mọi thắc mắc liên hệ qua{' '}
          <a href="https://zalo.me/0901234567" target="_blank" rel="noopener noreferrer" style={linkStyle}>
            Zalo
          </a>
          . Website:{' '}
          <a href="https://edream.vn" target="_blank" rel="noopener noreferrer" style={linkStyle}>
            edream.vn
          </a>
          . Xem thêm{' '}
          <Link to="/privacy" style={linkStyle}>Chính sách bảo mật</Link>.
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
