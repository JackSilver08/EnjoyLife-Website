package handlers

import (
 "context"
 "time"

 "github.com/enjoy-life/store-api/internal/payment"
)

// StartPayOSReconciler periodically checks payment links with the authenticated
// provider API. It never trusts the customer's browser status and never releases
// reserved stock if payOS cannot confirm cancellation/expiry.
func (a *App) StartPayOSReconciler(ctx context.Context){
 if !a.payOSReady(){return}
 ticker:=time.NewTicker(5*time.Minute);defer ticker.Stop()
 for {
  select{
  case <-ctx.Done():return
  case <-ticker.C:a.reconcileExpiredPayOS(ctx)
  }
 }
}

func (a *App) reconcileExpiredPayOS(parent context.Context){
 ctx,cancel:=context.WithTimeout(parent,90*time.Second);defer cancel()
 rows,err:=a.DB.Query(ctx,`SELECT pa.provider_order_code,o.total_vnd
 FROM payment_attempts pa JOIN orders o ON o.id=pa.order_id
 WHERE pa.provider='PAYOS' AND pa.status IN ('PENDING','REVIEW_REQUIRED')
  AND o.payment_status='UNPAID' AND o.status='PENDING_CONFIRMATION'
  AND pa.updated_at < now() - interval '20 minutes'
 ORDER BY pa.updated_at LIMIT 30`)
 if err!=nil{return}
 type pending struct{code,amount int64};list:=[]pending{}
 for rows.Next(){var p pending;if rows.Scan(&p.code,&p.amount)==nil{list=append(list,p)}}
 rows.Close()
 api:=a.payOS()
 for _,p:=range list{
  if ctx.Err()!=nil{return}
  status,err:=api.Get(ctx,p.code);if err!=nil||status.OrderCode!=p.code||status.Amount!=p.amount{continue}
  if (status.AmountPaid>0&&status.AmountPaid!=p.amount)||(status.Status=="PAID"&&status.AmountPaid!=p.amount){
   _=a.recordProviderReview(ctx,p.code,p.amount,status.AmountPaid)
   continue
  }
  if status.Status=="PAID"&&status.AmountPaid==p.amount{
   // Shared transaction serializes reconciliation against webhook/cancellation.
   _,_=a.recordProviderPaid(ctx,p.code,p.amount)
   continue
  }
  if status.AmountPaid>0{
   _=a.recordProviderReview(ctx,p.code,p.amount,status.AmountPaid)
   continue
  }
  if status.Status=="CANCELLED"||status.Status=="EXPIRED"{
   _=a.finalizePayOSCancellation(ctx,p.code)
   continue
  }
  if status.Status=="PENDING"{
   result,e:=api.Cancel(ctx,p.code)
   if e==nil&&result.Status=="CANCELLED"&&result.Amount==p.amount&&result.AmountPaid==0{
    _=a.finalizePayOSCancellation(ctx,p.code)
   }
  }
 }
}

// Keep an explicit reference to the payment transport type so refactors cannot
// silently switch the reconciliation path to an unauthenticated URL callback.
var _=payment.OfficialAPI
