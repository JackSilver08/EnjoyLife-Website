package handlers

import (
	"context"
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/enjoy-life/store-api/internal/config"
	"github.com/enjoy-life/store-api/internal/store"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type App struct {
	DB     *pgxpool.Pool
	Config config.Config
}

type Variant struct {
	ID        string `json:"id"`
	SKU       string `json:"sku"`
	Color     string `json:"color"`
	Size      string `json:"size"`
	PriceVND  int64  `json:"price_vnd"`
	Available int    `json:"available"`
}
type Product struct {
	ID           string    `json:"id"`
	Slug         string    `json:"slug"`
	Name         string    `json:"name"`
	Description  string    `json:"description"`
	ImageURL     string    `json:"image_url"`
	Collection   string    `json:"collection"`
	CategorySlug string    `json:"category_slug"`
	Available    int       `json:"available"`
	PriceVND     int64     `json:"price_vnd"`
	Variants     []Variant `json:"variants"`
 Images       []GalleryImage `json:"images"`
}
type OrderItemRequest struct {
	VariantID string `json:"variant_id" binding:"required"`
	Quantity  int    `json:"quantity" binding:"required"`
}
type CreateOrderRequest struct {
	ClientOrderKey  string             `json:"client_order_key" binding:"required"`
	CustomerName    string             `json:"customer_name" binding:"required"`
	CustomerPhone   string             `json:"customer_phone" binding:"required"`
	ShippingAddress string             `json:"shipping_address" binding:"required"`
	Note            string             `json:"note"`
	PaymentMethod   string             `json:"payment_method" binding:"required"`
	Items           []OrderItemRequest `json:"items" binding:"required"`
}

func Router(a *App) *gin.Engine {
	r := gin.New()
	// Do not log order lookup URLs: their random tokens are bearer secrets.
	r.Use(gin.Recovery())
	r.Use(func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("Cache-Control", "no-store")
		c.Next()
	})
	api := r.Group("/api/v1")
	api.Use(a.enforceAdminRole)
	api.GET("/health", a.health)
	api.GET("/media/:filename", a.publicMedia)
	api.GET("/site/content", a.siteContentGet)
	api.GET("/products", a.products)
	api.GET("/products/search", a.publicCatalogSearch)
	api.GET("/products/filters", a.publicCatalogFilters)
	api.GET("/products/:slug", a.product)
    // Enjoy Journal public: only published, non-archived articles.
    api.GET("/blog/articles", a.blogFeed)
    api.GET("/blog/articles/:slug", a.blogDetail)
    api.GET("/blog/categories", a.blogCategories)
    api.GET("/blog/tags", a.blogTags)
	api.POST("/auth/register", a.register)
	api.POST("/auth/login", a.login)
	api.POST("/auth/admin-demo", a.devAdminLogin)
	api.POST("/auth/logout", a.logout)
	api.POST("/auth/change-password", a.changePassword)
	api.GET("/auth/me", a.me)
	api.GET("/account/orders", a.myOrders)
	api.POST("/orders", a.createOrder)
    api.POST("/orders/:token/payment-link",a.createPayOSLink)
    api.POST("/orders/:token/cancel-payment",a.cancelPayOS)
    api.GET("/orders/:token/payment-status",a.payOSStatus)
    api.POST("/payments/payos/webhook",a.payOSWebhook)
	api.GET("/orders/:token", a.orderStatus)
	api.GET("/payments/config",func(c *gin.Context){c.JSON(200,gin.H{"payos_enabled":a.payOSReady()})})
	api.GET("/policies", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"policies": []gin.H{
			{"title": "Thanh toán", "content": "Enjoy Life hỗ trợ COD và thanh toán QR payOS khi kênh được bật."},
			{"title": "Giao hàng", "content": "Thời gian và phí giao hàng được xác nhận khi cửa hàng liên hệ xử lý đơn."},
			{"title": "Đổi trả", "content": "Vui lòng liên hệ cửa hàng để xác minh điều kiện đổi trả. Chính sách chính thức sẽ được công bố trước khi mở bán."},
		}})
	})
	api.POST("/ai/customer", func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "Chưa cấu hình LLM; không giả lập câu trả lời AI."})
	})
	api.GET("/admin/media", a.adminMediaList)
	api.POST("/admin/media", a.adminMediaUpload)
	api.POST("/admin/media/bulk", a.adminMediaBulkZip)
	api.PUT("/admin/site/content", a.adminSiteContentPut)
	api.GET("/admin/summary", a.adminSummary)
	api.GET("/admin/orders", a.adminOrders)
	api.GET("/admin/users", a.adminUsers)
	api.GET("/admin/staff", a.adminStaffList)
	api.POST("/admin/staff", a.adminStaffCreate)
	api.PATCH("/admin/staff/:id", a.adminStaffSetDisabled)
	api.POST("/admin/staff/:id/reset-password", a.adminStaffResetPassword)
	api.GET("/admin/dashboard", a.adminDashboard)
	api.GET("/admin/inventory", a.adminInventory)
	api.PATCH("/admin/inventory/:id", a.adminAdjustInventory)
	api.GET("/admin/inventory/:id/history", a.adminInventoryHistory)
	api.PATCH("/admin/orders/:no/status", a.adminChangeOrderStatus)
	api.POST("/admin/orders/:no/paid", a.adminMarkCODPaid)
	api.GET("/admin/products", a.adminProducts)
	api.POST("/admin/products", a.adminCreateProduct)
	api.POST("/admin/products/import", a.adminImportProducts)
	api.PATCH("/admin/products/:id", a.adminUpdateProduct)
	api.DELETE("/admin/products/:id", a.adminArchiveProduct)
	api.POST("/admin/products/:id/restore", a.adminRestoreProduct)
	api.GET("/admin/reports", a.adminReports)
    // Enjoy Journal admin: session/role checked inside every handler.
    api.GET("/admin/blog/articles", a.adminBlogFeed)
    api.GET("/admin/blog/articles/:id", a.adminBlogDetail)
    api.POST("/admin/blog/articles", a.adminBlogCreate)
    api.PUT("/admin/blog/articles/:id", a.adminBlogUpdate)
    api.PATCH("/admin/blog/articles/:id/status", a.adminBlogStatus)
    api.DELETE("/admin/blog/articles/:id", a.adminBlogArchive)
    api.POST("/admin/blog/categories", a.adminBlogCategoryCreate)
    api.POST("/admin/blog/tags", a.adminBlogTagCreate)
	api.GET("/admin/products/:id/images", a.adminGetGallery)
	api.PUT("/admin/products/:id/images", a.adminSaveGallery)
	api.GET("/admin/products/:id/variants", a.adminVariants)
	api.POST("/admin/products/:id/variants", a.adminCreateVariant)
	api.PATCH("/admin/variants/:id", a.adminUpdateVariant)
	// Sprint 8: webhook is public but accepts ONLY a verified payOS HMAC.
	return r
}
func (a *App) health(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
	defer cancel()
	if err := a.DB.Ping(ctx); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"status": "db_unavailable"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "enjoy-life-api"})
}
func (a *App) products(c *gin.Context) {
	query := strings.TrimSpace(c.Query("q"))
	ctx, cancel := context.WithTimeout(c.Request.Context(), 3*time.Second)
	defer cancel()
	rows, err := a.DB.Query(ctx, `SELECT p.id::text,p.slug,p.name,p.description,p.image_url,p.collection_name,c.slug,
      MIN(v.price_vnd), COALESCE(SUM(GREATEST(i.on_hand-i.reserved-i.unavailable,0)),0)::int
      FROM products p JOIN categories c ON c.id=p.category_id
      JOIN product_variants v ON v.product_id=p.id AND v.active
      LEFT JOIN inventory i ON i.variant_id=v.id
      WHERE p.published AND p.archived_at IS NULL AND ($1 = '' OR p.name ILIKE '%' || $1 || '%' OR p.collection_name ILIKE '%' || $1 || '%')
      GROUP BY p.id,c.slug ORDER BY p.created_at DESC LIMIT 60`, query)
	if err != nil {
		serverError(c, err)
		return
	}
	defer rows.Close()
	items := make([]Product, 0)
	for rows.Next() {
		var p Product
		if err := rows.Scan(&p.ID, &p.Slug, &p.Name, &p.Description, &p.ImageURL, &p.Collection, &p.CategorySlug, &p.PriceVND, &p.Available); err != nil {
			serverError(c, err)
			return
		}
		p.Variants = []Variant{}
		items = append(items, p)
	}
	if err := rows.Err(); err != nil {
		serverError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}
func (a *App) product(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 3*time.Second)
	defer cancel()
	p := Product{Variants: []Variant{}}
	err := a.DB.QueryRow(ctx, `SELECT p.id::text,p.slug,p.name,p.description,p.image_url,p.collection_name,c.slug,
      COALESCE((SELECT MIN(price_vnd) FROM product_variants WHERE product_id=p.id AND active),0)
      FROM products p JOIN categories c ON c.id=p.category_id WHERE p.slug=$1 AND p.published AND p.archived_at IS NULL`, c.Param("slug")).Scan(
		&p.ID, &p.Slug, &p.Name, &p.Description, &p.ImageURL, &p.Collection, &p.CategorySlug, &p.PriceVND)
	if errors.Is(err, pgx.ErrNoRows) {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy sản phẩm"})
		return
	}
	if err != nil {
		serverError(c, err)
		return
	}
	rows, err := a.DB.Query(ctx, `SELECT v.id::text,v.sku,v.color,v.size,v.price_vnd,
      i.on_hand-i.reserved-i.unavailable FROM product_variants v JOIN inventory i ON i.variant_id=v.id
      WHERE v.product_id=$1 AND v.active ORDER BY v.color,v.size`, p.ID)
	if err != nil {
		serverError(c, err)
		return
	}
	defer rows.Close()
	for rows.Next() {
		var v Variant
		if err := rows.Scan(&v.ID, &v.SKU, &v.Color, &v.Size, &v.PriceVND, &v.Available); err != nil {
			serverError(c, err)
			return
		}
		p.Variants = append(p.Variants, v)
	}
	if err := rows.Err(); err != nil {
		serverError(c, err)
		return
	}
	p.Images=[]GalleryImage{}
 imageRows,imageErr:=a.DB.Query(ctx,`SELECT url,alt FROM product_images WHERE product_id=$1 ORDER BY position`,p.ID)
 if imageErr!=nil{serverError(c,imageErr);return}
 for imageRows.Next(){var img GalleryImage
  if err=imageRows.Scan(&img.URL,&img.Alt);err!=nil{imageRows.Close();serverError(c,err);return}
  p.Images=append(p.Images,img)
 }
 imageErr=imageRows.Err();imageRows.Close()
 if imageErr!=nil{serverError(c,imageErr);return}
 if len(p.Images)==0&&p.ImageURL!=""{p.Images=append(p.Images,GalleryImage{URL:p.ImageURL,Alt:p.Name})}
 c.JSON(http.StatusOK, p)
}

func randomHex(n int) (string, error) {
	b := make([]byte, n)
	_, err := rand.Read(b)
	if err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}
func uuid() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16]), nil
}
func (a *App) createOrder(c *gin.Context) {
	user := a.loadUser(c)
	var input CreateOrderRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dữ liệu đơn hàng không hợp lệ"})
		return
	}
	if err := store.ValidCustomer(input.CustomerName, input.CustomerPhone, input.ShippingAddress); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if input.PaymentMethod != "COD" && input.PaymentMethod != "PAYOS" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Phương thức thanh toán không hợp lệ"})
		return
	}
	if input.PaymentMethod == "PAYOS" && !a.payOSReady() {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Thanh toán QR chưa được kích hoạt; vui lòng chọn COD."})
		return
	}
	if len(input.Items) == 0 || len(input.Items) > 20 || len(input.ClientOrderKey) > 100 || len(input.ClientOrderKey) < 12 || len(input.Note) > 500 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Số lượng sản phẩm hoặc thông tin đơn hàng không hợp lệ"})
		return
	}
	seen := map[string]bool{}
	for _, item := range input.Items {
		if item.Quantity < 1 || item.Quantity > 10 || seen[item.VariantID] {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Biến thể trùng hoặc số lượng không hợp lệ"})
			return
		}
		seen[item.VariantID] = true
	}
	sort.Slice(input.Items, func(i, j int) bool { return input.Items[i].VariantID < input.Items[j].VariantID })
	ctx, cancel := context.WithTimeout(c.Request.Context(), 8*time.Second)
	defer cancel()
	// Idempotency: same client_order_key returns the original order instead of double-reserving.
	var existingToken, existingNo, existingMethod, existingPayment string
	e := a.DB.QueryRow(ctx, "SELECT public_token,order_no,payment_method,payment_status FROM orders WHERE client_order_key=$1", input.ClientOrderKey).Scan(&existingToken, &existingNo,&existingMethod,&existingPayment)
	if e == nil {
        if existingMethod != input.PaymentMethod {c.JSON(409, gin.H{"error":"Không được đổi phương thức của đơn đã tạo."});return}
		c.JSON(http.StatusOK, gin.H{"order_token": existingToken, "order_no": existingNo, "status": "PENDING_CONFIRMATION", "payment_status": existingPayment})
		return
	}
	if !errors.Is(e, pgx.ErrNoRows) {
		serverError(c, e)
		return
	}
	tx, err := a.DB.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.Serializable})
	if err != nil {
		serverError(c, err)
		return
	}
	defer tx.Rollback(ctx)
	orderID, err := uuid()
	if err != nil {
		serverError(c, err)
		return
	}
	token, err := randomHex(24)
	if err != nil {
		serverError(c, err)
		return
	}
	orderNo := "EL-" + strings.ToUpper(orderID[:8])
	type itemSnapshot struct {
		id, sku, name, color, size string
		price                      int64
		quantity                   int
	}
	snapshots := make([]itemSnapshot, 0, len(input.Items))
	var total int64
	for _, item := range input.Items {
		var snap itemSnapshot
		var onHand, reserved, unavailable int
		err = tx.QueryRow(ctx, `SELECT v.id::text,v.sku,p.name,v.color,v.size,v.price_vnd,
          i.on_hand,i.reserved,i.unavailable
          FROM product_variants v JOIN products p ON p.id=v.product_id
          JOIN inventory i ON i.variant_id=v.id
          WHERE v.id::text=$1 AND v.active AND p.published AND p.archived_at IS NULL FOR UPDATE OF i`, item.VariantID).Scan(
			&snap.id, &snap.sku, &snap.name, &snap.color, &snap.size, &snap.price, &onHand, &reserved, &unavailable)
		if errors.Is(err, pgx.ErrNoRows) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Sản phẩm không còn khả dụng"})
			return
		}
		if err != nil {
			serverError(c, err)
			return
		}
		if store.Available(onHand, reserved, unavailable) < item.Quantity {
			c.JSON(http.StatusConflict, gin.H{"error": "Không đủ hàng cho SKU " + snap.sku})
			return
		}
		snap.quantity = item.Quantity
		snapshots = append(snapshots, snap)
		total += snap.price * int64(item.Quantity)
	}
	// All price/availability values are read and locked from DB: never trust frontend totals.
	var userID any
	if user != nil {
		userID = user.ID
	}
	_, err = tx.Exec(ctx, `INSERT INTO orders(id,public_token,client_order_key,order_no,customer_name,
	      customer_phone,shipping_address,note,payment_method,payment_status,status,total_vnd,user_id)
	      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$11,'UNPAID','PENDING_CONFIRMATION',$9,$10)`,
		orderID, token, input.ClientOrderKey, orderNo, input.CustomerName, input.CustomerPhone, input.ShippingAddress, input.Note, total, userID,input.PaymentMethod)
	if err != nil {
		serverError(c, err)
		return
	}
	for _, snap := range snapshots {
		_, err = tx.Exec(ctx, `UPDATE inventory SET reserved=reserved+$1 WHERE variant_id=$2`, snap.quantity, snap.id)
		if err != nil {
			serverError(c, err)
			return
		}
		_, err = tx.Exec(ctx, `INSERT INTO order_items(order_id,variant_id,sku_snapshot,name_snapshot,color_snapshot,
          size_snapshot,quantity,unit_price_vnd) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
			orderID, snap.id, snap.sku, snap.name, snap.color, snap.size, snap.quantity, snap.price)
		if err != nil {
			serverError(c, err)
			return
		}
		_, err = tx.Exec(ctx, `INSERT INTO stock_movements(variant_id,order_id,movement_type,reserved_delta)
          VALUES($1,$2,'RESERVE',$3)`, snap.id, orderID, snap.quantity)
		if err != nil {
			serverError(c, err)
			return
		}
	}
	if err = tx.Commit(ctx); err != nil {
		// Serializable retry is not implemented in starter; client may retry with the SAME key.
		if strings.Contains(strings.ToLower(err.Error()), "duplicate key") {
			c.JSON(http.StatusConflict, gin.H{"error": "Yêu cầu đã được xử lý. Vui lòng kiểm tra đơn hàng."})
			return
		}
		serverError(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"order_token": token, "order_no": orderNo, "total_vnd": total, "status": "PENDING_CONFIRMATION", "payment_status": "UNPAID"})
}
func (a *App) orderStatus(c *gin.Context) {
	tok := c.Param("token")
	if len(tok) != 48 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy đơn"})
		return
	}
	var orderNo, status, paymentStatus, method string
	var total int64
	var created time.Time
	err := a.DB.QueryRow(c.Request.Context(), `SELECT order_no,status,payment_status,payment_method,total_vnd,created_at
      FROM orders WHERE public_token=$1`, tok).Scan(&orderNo, &status, &paymentStatus, &method, &total, &created)
	if errors.Is(err, pgx.ErrNoRows) {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy đơn"})
		return
	}
	if err != nil {
		serverError(c, err)
		return
	}
	var payURL,qr,attemptState string
    if method=="PAYOS"{
      e:=a.DB.QueryRow(c.Request.Context(),`SELECT COALESCE(checkout_url,''),COALESCE(qr_code,''),status FROM payment_attempts WHERE order_id=(SELECT id FROM orders WHERE public_token=$1) AND provider='PAYOS'`,tok).Scan(&payURL,&qr,&attemptState)
      if e!=nil && !errors.Is(e,pgx.ErrNoRows){serverError(c,e);return}
    }
    c.JSON(http.StatusOK, gin.H{"order_no": orderNo, "status": status, "payment_status": paymentStatus, "payment_method": method, "total_vnd": total, "created_at": created,"checkout_url":payURL,"qr_code":qr,"gateway_status":attemptState})
}
func (a *App) adminAuth(c *gin.Context) {
	if a.Config.AdminKey == "" {
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Admin chưa được cấu hình"})
		return
	}
	key := c.GetHeader("X-Admin-Key")
	if len(key) != len(a.Config.AdminKey) || subtle.ConstantTimeCompare([]byte(key), []byte(a.Config.AdminKey)) != 1 {
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Không có quyền"})
		return
	}
	c.Next()
}
func (a *App) adminSummary(c *gin.Context) {
	if a.requireAdmin(c) == nil {
		return
	}
	var orders int64
	var amount int64
	err := a.DB.QueryRow(c.Request.Context(), `SELECT count(*),COALESCE(sum(total_vnd),0) FROM orders`).Scan(&orders, &amount)
	if err != nil {
		serverError(c, err)
		return
	}
	var lowStock int64
	err = a.DB.QueryRow(c.Request.Context(), `SELECT count(*) FROM inventory WHERE on_hand-reserved-unavailable<=3`).Scan(&lowStock)
	if err != nil {
		serverError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"orders_created": orders, "order_value_vnd": amount, "low_stock_skus": lowStock, "note": "Giá trị đơn đã tạo; không phải doanh thu đã thu."})
}
func serverError(c *gin.Context, err error) {
	slog.Error("API request failed", "error", err)
	c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi máy chủ, vui lòng thử lại"})
}
