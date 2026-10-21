package payment

// Gateway is a future integration contract. Do NOT enable online payments before
// verified webhooks, idempotency, refund handling and reconciliation are tested.
type CheckoutRequest struct {
	OrderID    string
	AmountVND  int64
	SuccessURL string
	CancelURL  string
}
type CheckoutResult struct {
	ProviderRef string
	CheckoutURL string
}
type Gateway interface {
	CreateCheckout(CheckoutRequest) (CheckoutResult, error)
	VerifyWebhook(body []byte) (string, error)
}
