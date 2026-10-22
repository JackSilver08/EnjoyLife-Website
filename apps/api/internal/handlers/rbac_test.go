package handlers

import (
 "net/http"
 "testing"
)
func TestStaffPermissionMatrix(t *testing.T){
 allowed:=[]string{"/api/v1/admin/orders","/api/v1/admin/products","/api/v1/admin/inventory","/api/v1/admin/inventory/:id/history","/api/v1/admin/products/:id/variants","/api/v1/admin/products/:id/images"}
 for _,route:=range allowed{
  if !staffCanAccess(http.MethodGet,route){t.Errorf("staff should read %s",route)}
  for _,method:=range []string{"POST","PUT","DELETE"}{if staffCanAccess(method,route){t.Errorf("staff unexpectedly allowed %s %s",method,route)}}
 }
 for _,route:=range []string{"/api/v1/admin/users","/api/v1/admin/staff","/api/v1/admin/reports","/api/v1/admin/summary","/api/v1/admin/dashboard","/api/v1/admin/media","/api/v1/admin/blog/articles","/api/v1/admin/unknown"}{
  for _,method:=range []string{"GET","POST","PATCH","DELETE"}{if staffCanAccess(method,route){t.Errorf("staff unexpectedly allowed %s %s",method,route)}}
 }
 for _,route:=range []string{"/api/v1/admin/orders/:no/status","/api/v1/admin/inventory/:id"}{
 if !staffCanAccess("PATCH",route){t.Errorf("staff should PATCH %s",route)}
 if staffCanAccess("GET",route)||staffCanAccess("DELETE",route){t.Errorf("staff route method leak %s",route)}
 }
}
