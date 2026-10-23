from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table, TableStyle,
    PageBreak, Image, KeepTogether, HRFlowable, Flowable
)
from reportlab.lib.utils import ImageReader

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "EnjoyLife_Huong_Dan_Su_Dung.pdf"
FONT = Path(r"C:\Windows\Fonts\arial.ttf")
FONT_BOLD = Path(r"C:\Windows\Fonts\arialbd.ttf")
FONT_ITALIC = Path(r"C:\Windows\Fonts\ariali.ttf")
pdfmetrics.registerFont(TTFont("Arial", str(FONT)))
pdfmetrics.registerFont(TTFont("Arial-Bold", str(FONT_BOLD)))
pdfmetrics.registerFont(TTFont("Arial-Italic", str(FONT_ITALIC)))

INK = colors.HexColor("#1e2822")
SAGE = colors.HexColor("#e9eee8")
CREAM = colors.HexColor("#f7f4ee")
CLAY = colors.HexColor("#a86f59")
LINE = colors.HexColor("#d7ddd4")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="CoverTitle", fontName="Arial-Bold", fontSize=30, leading=35, textColor=INK, alignment=TA_LEFT, spaceAfter=8))
styles.add(ParagraphStyle(name="CoverSub", fontName="Arial-Italic", fontSize=17, leading=23, textColor=CLAY, spaceAfter=14))
styles.add(ParagraphStyle(name="H1VN", parent=styles["Heading1"], fontName="Arial-Bold", fontSize=20, leading=25, textColor=INK, spaceBefore=4, spaceAfter=8))
styles.add(ParagraphStyle(name="H2VN", parent=styles["Heading2"], fontName="Arial-Bold", fontSize=13, leading=17, textColor=INK, spaceBefore=8, spaceAfter=5))
styles.add(ParagraphStyle(name="BodyVN", parent=styles["BodyText"], fontName="Arial", fontSize=9.5, leading=14, textColor=colors.HexColor("#3f4841"), spaceAfter=6))
styles.add(ParagraphStyle(name="SmallVN", parent=styles["BodyText"], fontName="Arial", fontSize=8, leading=11, textColor=colors.HexColor("#647066"), spaceAfter=4))
styles.add(ParagraphStyle(name="Callout", parent=styles["BodyText"], fontName="Arial", fontSize=9, leading=13, textColor=INK, backColor=SAGE, borderColor=LINE, borderWidth=.6, borderPadding=8, spaceBefore=5, spaceAfter=8))
styles.add(ParagraphStyle(name="Step", parent=styles["BodyText"], fontName="Arial", fontSize=9, leading=13, textColor=INK, leftIndent=4, spaceAfter=3))
styles.add(ParagraphStyle(name="Caption", parent=styles["BodyText"], fontName="Arial-Italic", fontSize=7.5, leading=10, alignment=TA_CENTER, textColor=colors.HexColor("#657066"), spaceAfter=8))

def P(text, style="BodyVN"):
    return Paragraph(text, styles[style])

def img(path, width, height=None):
    im = Image(str(path), width=width, height=height)
    im.hAlign = "CENTER"
    return im

def product_images():
    return sorted((ROOT / "Sản Phẩm").glob("*.jpg"))[:6]

class FlowDiagram(Flowable):
    def __init__(self, labels, width=170*mm, height=30*mm):
        Flowable.__init__(self); self.labels=labels; self.width=width; self.height=height
    def draw(self):
        c=self.canv; n=len(self.labels); gap=self.width/n
        for i,label in enumerate(self.labels):
            x=i*gap+3; y=10
            c.setFillColor(SAGE if i%2==0 else colors.HexColor("#f4eae4")); c.setStrokeColor(LINE)
            c.roundRect(x,y,gap-10,22,4,fill=1,stroke=1)
            c.setFillColor(INK); c.setFont("Arial-Bold",7.5); c.drawCentredString(x+(gap-10)/2,y+12,str(label))
            if i<n-1:
                c.setStrokeColor(CLAY); c.setLineWidth(1); c.line(x+gap-7,y+11,x+gap-2,y+11)
                c.line(x+gap-4,y+13,x+gap-2,y+11); c.line(x+gap-4,y+9,x+gap-2,y+11)

def ui_card(title, lines, width=82*mm):
    data=[[P(title,"H2VN")]]+[[P(x,"SmallVN")] for x in lines]
    t=Table(data,colWidths=[width])
    t.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),INK),("TEXTCOLOR",(0,0),(-1,0),colors.white),
                           ("BOX",(0,0),(-1,-1),.6,LINE),("INNERGRID",(0,1),(-1,-1),.25,LINE),
                           ("BACKGROUND",(0,1),(-1,-1),colors.white),("LEFTPADDING",(0,0),(-1,-1),8),
                           ("RIGHTPADDING",(0,0),(-1,-1),8),("TOPPADDING",(0,0),(-1,-1),6),("BOTTOMPADDING",(0,0),(-1,-1),6)]))
    return t

def footer(canvas, doc):
    canvas.saveState(); canvas.setStrokeColor(LINE); canvas.line(18*mm,13*mm,192*mm,13*mm)
    canvas.setFont("Arial",7); canvas.setFillColor(colors.HexColor("#738078"))
    canvas.drawString(18*mm,8*mm,"Enjoy Life · Hướng dẫn sử dụng")
    canvas.drawRightString(192*mm,8*mm,f"Trang {doc.page}"); canvas.restoreState()

class GuideDoc(BaseDocTemplate):
    def __init__(self, filename):
        super().__init__(filename, pagesize=A4, rightMargin=18*mm, leftMargin=18*mm, topMargin=16*mm, bottomMargin=19*mm)
        frame=Frame(self.leftMargin,self.bottomMargin,self.width,self.height,id="normal")
        self.addPageTemplates([PageTemplate(id="main",frames=frame,onPage=footer)])

def build():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc=GuideDoc(str(OUT)); story=[]
    photos=product_images()
    story += [Spacer(1,12*mm), P("enjoylife", "CoverSub"), P("Hướng dẫn sử dụng website", "CoverTitle"),
              P("Cẩm nang thao tác cho khách hàng và quản trị viên", "CoverSub"),
              P("Phiên bản hướng dẫn: 24/10/2026 · Website: enjoylife-web.onrender.com", "SmallVN"), Spacer(1,7*mm)]
    if len(photos)>=4:
        row=[img(p,42*mm,42*mm) for p in photos[:4]]
        t=Table([row],colWidths=[43*mm]*4); t.setStyle(TableStyle([("VALIGN",(0,0),(-1,-1),"MIDDLE"),("BOX",(0,0),(-1,-1),.5,LINE),("INNERGRID",(0,0),(-1,-1),.5,colors.white)])); story += [t,P("Hình ảnh sản phẩm minh họa từ danh mục Enjoy Life.","Caption")]
    story += [Spacer(1,4*mm), P("Mục tiêu của tài liệu", "H2VN"), P("Tài liệu giúp người dùng thao tác trọn vẹn từ khám phá sản phẩm, chọn biến thể, đặt hàng, thanh toán và tra cứu đơn. Phần cuối dành cho Admin vận hành sản phẩm, nội dung, kho và đơn hàng.","BodyVN"),
              P("Lưu ý: dữ liệu giá, tồn kho và trạng thái thanh toán được xác minh ở máy chủ. Không chia sẻ đường dẫn tra cứu đơn hoặc thông tin tài khoản cho người khác.","Callout"), PageBreak()]

    story += [P("1. Bản đồ tính năng", "H1VN"), P("Website được chia thành hai khu vực: trải nghiệm mua sắm công khai và khu vực quản trị có phân quyền.","BodyVN"),
              FlowDiagram(["Trang chủ","Cửa hàng","Sản phẩm","Giỏ hàng","Đặt hàng","Tra cứu"]), Spacer(1,5*mm),
              Table([[ui_card("Khách hàng",["Trang chủ / Cửa hàng / Tìm kiếm","Chi tiết sản phẩm, màu và size","Giỏ hàng và đặt hàng COD","Thanh toán QR payOS","Chatbot Hỏi Enjoy","Journal và Liên hệ"]),ui_card("Quản trị viên",["Dashboard và đơn hàng","Sản phẩm, media, biến thể","Kho và tồn theo SKU","Journal / bài viết","Khách hàng và audit","Báo cáo vận hành"])]] ,colWidths=[86*mm,86*mm],style=TableStyle([("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),0),("RIGHTPADDING",(0,0),(-1,-1),4)])), PageBreak()]

    story += [P("2. Hướng dẫn dành cho khách hàng", "H1VN"), P("2.1. Khám phá trang chủ", "H2VN"), P("Từ thanh điều hướng, chọn CỬA HÀNG để xem danh mục, JOURNAL để đọc bài viết, hoặc LIÊN HỆ để gửi lời nhắn. Khu vực hero và các khối sản phẩm nổi bật dẫn nhanh tới nội dung chính.","BodyVN")]
    if len(photos)>=6:
        t=Table([[img(photos[4],62*mm,48*mm),img(photos[5],62*mm,48*mm)]],colWidths=[76*mm,76*mm]); t.setStyle(TableStyle([("VALIGN",(0,0),(-1,-1),"MIDDLE"),("BOX",(0,0),(-1,-1),.5,LINE),("INNERGRID",(0,0),(-1,-1),.5,colors.white)])); story += [t,P("Minh họa: các thẻ sản phẩm và hình ảnh editorial.","Caption")]
    story += [P("2.2. Cửa hàng, tìm kiếm và chọn sản phẩm", "H2VN"), P("1) Mở CỬA HÀNG. 2) Dùng ô tìm kiếm hoặc nhóm sản phẩm. 3) Chọn thẻ sản phẩm để xem mô tả, giá và ảnh. 4) Chọn đúng màu, size và số lượng. 5) Nhấn thêm vào giỏ.","Step"),
              P("Tồn kho được kiểm tra lại lúc đặt hàng. Nếu sản phẩm vừa hết, hệ thống sẽ báo lỗi và không tạo đơn.","Callout"),
              P("2.3. Giỏ hàng và đặt hàng", "H2VN"), P("Mở biểu tượng túi ở góc phải để kiểm tra sản phẩm. Điều chỉnh số lượng, xóa dòng không cần, sau đó nhập họ tên, email, số điện thoại và địa chỉ giao hàng. Tổng tiền cuối cùng do máy chủ tính lại.","BodyVN"),
              FlowDiagram(["Chọn biến thể","Thêm giỏ","Nhập thông tin","Xác nhận đơn"]), PageBreak()]

    story += [P("3. Thanh toán và tra cứu đơn", "H1VN"), P("3.1. Thanh toán khi nhận hàng (COD)", "H2VN"), P("Chọn Thanh toán khi nhận hàng. Nhấn XÁC NHẬN ĐẶT HÀNG. Hệ thống giữ tồn kho và tạo một mã/đường dẫn tra cứu riêng cho đơn.","BodyVN"),
              P("3.2. Thanh toán QR qua payOS", "H2VN"), P("Nếu payOS đã được bật, chọn Thanh toán mã QR qua payOS. Sau khi tạo đơn, nhấn HIỂN THỊ MÃ QR, mở ứng dụng ngân hàng để quét và đối chiếu số tiền trước khi xác nhận.","BodyVN"),
              P("Chỉ trạng thái được xác nhận từ máy chủ payOS mới được xem là đã thanh toán. Nếu mã QR lỗi, không chuyển khoản thêm; dùng nút HỦY GIAO DỊCH VÀ ĐƠN HÀNG hoặc liên hệ cửa hàng.","Callout"),
              Table([[ui_card("Trạng thái thường gặp",["UNPAID · Chưa thanh toán","PAID · Đã thanh toán","CANCELLED · Đã hủy","REVIEW_REQUIRED · Cần đối soát"]),ui_card("Khi gặp lỗi",["Kiểm tra lại số tiền","Không tạo đơn thứ hai ngay","Tải lại trang tra cứu","Liên hệ kèm mã đơn"])]] ,colWidths=[86*mm,86*mm],style=TableStyle([("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),0),("RIGHTPADDING",(0,0),(-1,-1),4)])),
              P("3.3. Tra cứu đơn hàng", "H2VN"), P("Giữ lại đường dẫn /orders/<mã-đơn>. Người dùng có thể mở lại để xem trạng thái, QR đã tạo, thanh toán và nút hủy nếu đơn còn đủ điều kiện. Tài khoản đã đăng nhập có thể xem lịch sử đơn trong Tài khoản.","BodyVN"), PageBreak()]

    story += [P("4. Trợ lý AI, Journal và Liên hệ", "H1VN"), P("4.1. Hỏi Enjoy · trợ lý mua sắm AI", "H2VN"), P("Nhấn nút HỎI ENJOY ở góc dưới. Có thể hỏi về giá, màu, size còn hàng hoặc chính sách cửa hàng. AI chỉ đọc danh mục đã xuất bản, biến thể/tồn kho và chính sách công khai; không xem mật khẩu, đơn hàng cá nhân hay thông tin thanh toán.","BodyVN"),
              Table([[P("Ví dụ câu hỏi", "H2VN"),P("Kết quả mong đợi", "H2VN")],[P("Có sản phẩm nào dưới 300.000đ?","BodyVN"),P("Gợi ý các sản phẩm đang bán phù hợp.","BodyVN")],[P("Áo này còn size M không?","BodyVN"),P("Kiểm tra tồn theo đúng biến thể.","BodyVN")],[P("Cửa hàng có chính sách gì?","BodyVN"),P("Tóm tắt chính sách công khai.","BodyVN")]],colWidths=[72*mm,98*mm],style=TableStyle([("BACKGROUND",(0,0),(-1,0),SAGE),("BOX",(0,0),(-1,-1),.5,LINE),("INNERGRID",(0,0),(-1,-1),.3,LINE),("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),7),("RIGHTPADDING",(0,0),(-1,-1),7)])),
              P("4.2. Journal", "H2VN"), P("Chọn JOURNAL để xem các bài viết thời trang. Mở một bài để đọc nội dung editorial; bài nháp chỉ hiển thị trong khu vực quản trị.","BodyVN"),
              P("4.3. Liên hệ", "H2VN"), P("Đi tới cuối trang, nhập nội dung và gửi form liên hệ. Không nhập mật khẩu, dữ liệu thanh toán hoặc thông tin nhạy cảm vào form.","BodyVN"), PageBreak()]

    story += [P("5. Hướng dẫn dành cho Admin", "H1VN"), P("Đăng nhập bằng tài khoản Admin đã cấu hình trên máy chủ. Không sử dụng tài khoản demo hoặc thông tin đăng nhập trong tài liệu để vận hành production.","Callout"),
              P("5.1. Dashboard và đơn hàng", "H2VN"), P("Dashboard hiển thị tổng quan vận hành. Tại Đơn hàng, Admin xem khách, sản phẩm, số tiền, phương thức thanh toán và chuyển trạng thái theo quy trình: chờ xác nhận → đã xác nhận → chuẩn bị → đang giao → đã giao → hoàn tất.","BodyVN"),
              P("5.2. Sản phẩm, biến thể và media", "H2VN"), P("Tạo/sửa tên, mô tả, bộ sưu tập, trạng thái xuất bản; quản lý SKU theo màu/size, giá và tồn. Tại Media, tải ảnh lên rồi chọn ảnh cho sản phẩm hoặc bài Journal. Chỉ sản phẩm đã publish mới xuất hiện ở cửa hàng công khai.","BodyVN"),
              P("5.3. Kho và tồn theo SKU", "H2VN"), P("Theo dõi on-hand, reserved và available. Nhập kho bằng phiếu, nhận từng phần, cách ly hàng lỗi và ghi lý do điều chỉnh. Không để AI tự thay đổi tồn kho; mọi thay đổi phải tạo chứng từ hoặc thao tác có audit.","BodyVN"),
              FlowDiagram(["Nhà cung cấp","Phiếu nhập","Nhận hàng","Kiểm tra","Đưa vào bán"]), PageBreak()]

    story += [P("6. Journal, bảo mật và xử lý lỗi", "H1VN"), P("6.1. Quản lý Journal", "H2VN"), P("Vào khu vực blog để tạo bài mới, soạn nội dung, chèn ảnh, xem preview và publish. Bài nháp không xuất hiện ở /blog công khai.","BodyVN"),
              P("6.2. Bảo mật vận hành", "H2VN"), P("Không đưa API key OpenAI, khóa payOS, mật khẩu Admin hoặc DATABASE_URL vào Git, ảnh chụp màn hình hay PDF công khai. Khi nghi ngờ lộ khóa, hãy rotate ngay trên nhà cung cấp và cập nhật biến môi trường Render.","Callout"),
              P("6.3. Bảng xử lý nhanh", "H2VN"),
              Table([[P("Hiện tượng","H2VN"),P("Hướng xử lý","H2VN")],[P("Chatbot báo chưa kích hoạt","BodyVN"),P("Kiểm tra OPENAI_API_KEY và AI_MODEL trên API Render; khởi động lại service.","BodyVN")],[P("QR payOS không hiện","BodyVN"),P("Kiểm tra PAYMENT_ENABLED, ba khóa payOS, WEB_ORIGIN và webhook HTTPS.","BodyVN")],[P("Đơn lỗi nhưng không hủy được","BodyVN"),P("Tải lại đường dẫn đơn; với lỗi cần đối soát, không chuyển khoản thêm và liên hệ Admin.","BodyVN")],[P("Cửa hàng thiếu sản phẩm","BodyVN"),P("Kiểm tra sản phẩm đã publish, media mapping và dữ liệu Supabase.","BodyVN")],[P("Render deploy lỗi","BodyVN"),P("Xem build log, kiểm tra Root Directory và Build/Start Command đúng service.","BodyVN")]],colWidths=[53*mm,117*mm],style=TableStyle([("BACKGROUND",(0,0),(-1,0),INK),("TEXTCOLOR",(0,0),(-1,0),colors.white),("BOX",(0,0),(-1,-1),.5,LINE),("INNERGRID",(0,0),(-1,-1),.3,LINE),("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),7),("RIGHTPADDING",(0,0),(-1,-1),7),("TOPPADDING",(0,0),(-1,-1),6),("BOTTOMPADDING",(0,0),(-1,-1),6)])),
              Spacer(1,8*mm), P("Kết thúc", "H2VN"), P("Enjoy Life được thiết kế như một cửa hàng thời trang kết hợp trải nghiệm editorial, dữ liệu tồn kho thực và trợ lý AI. Khi demo hoặc chấm thi, nên trình diễn theo thứ tự: Trang chủ → Cửa hàng → Chi tiết sản phẩm → Giỏ hàng → COD/payOS → Tra cứu đơn → Hỏi Enjoy → Admin.","BodyVN")]
    doc.build(story)
    print(OUT)

if __name__ == "__main__":
    build()
