package handlers
import "testing"
func TestOrderTransitionRules(t *testing.T){
 cases:=[]struct{from,to string;allow bool}{
  {"PENDING_CONFIRMATION","CONFIRMED",true},{"PENDING_CONFIRMATION","CANCELLED",true},
  {"CONFIRMED","PREPARING",true},{"PREPARING","SHIPPING",true},
  {"SHIPPING","DELIVERED",true},{"DELIVERED","COMPLETED",true},
  {"SHIPPING","CANCELLED",false},{"COMPLETED","CANCELLED",false},
  {"PENDING_CONFIRMATION","SHIPPING",false},
 }
 for _,c:=range cases{if canTransition(c.from,c.to)!=c.allow {t.Errorf("%s -> %s expected %v",c.from,c.to,c.allow)}}
}
