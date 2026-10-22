package handlers

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

const staffPermissionKey = "staff_permission_verified"

// staffCanAccess is a default-deny permission matrix. STAFF may only read
// operational data; mutations and account-management always require ADMIN.
func staffCanAccess(method, route string) bool {
	if method != http.MethodGet {
		return false
	}
	switch route {
	case "/api/v1/admin/orders",
		"/api/v1/admin/products",
		"/api/v1/admin/inventory",
		"/api/v1/admin/inventory/:id/history",
		"/api/v1/admin/products/:id/variants",
		"/api/v1/admin/products/:id/images":
		return true
	default:
		return false
	}
}

// enforceAdminRole protects every /admin endpoint before its handler runs.
func (a *App) enforceAdminRole(c *gin.Context) {
	if !strings.HasPrefix(c.Request.URL.Path, "/api/v1/admin/") {
		c.Next()
		return
	}
	user := a.loadUser(c)
	if user == nil {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Vui lòng đăng nhập để tiếp tục."})
		return
	}
	switch user.Role {
	case "ADMIN":
		c.Next()
	case "STAFF":
		if !staffCanAccess(c.Request.Method, c.FullPath()) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Nhân viên không có quyền thực hiện thao tác này."})
			return
		}
		c.Set(staffPermissionKey, true)
		c.Next()
	default:
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Không có quyền truy cập quản trị."})
	}
}

// Sensitive operations, including managing staff, require ADMIN exclusively.
func (a *App) requireAdminOnly(c *gin.Context) *currentUser {
	user := a.requireUser(c)
	if user == nil {
		return nil
	}
	if user.Role != "ADMIN" {
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Chỉ quản trị viên có quyền thực hiện thao tác này."})
		return nil
	}
	return user
}
