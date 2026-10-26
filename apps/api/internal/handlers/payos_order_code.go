package handlers

import (
	"crypto/rand"
	"math/big"
)

// A payOS orderCode must be unique for a merchant across every database and
// deployment using its credentials. Independent PostgreSQL sequences cannot
// provide that guarantee (e.g. Render and a developer's local database).
// Draw from a large, cryptographically random space, below JavaScript's
// maximum safe integer and far above the legacy 700000000-based sequence.
const (
	payOSOrderCodeBase  int64 = 100_000_000_000_000
	payOSOrderCodeRange int64 = 800_000_000_000_000
)

func generatePayOSOrderCode() (int64, error) {
	n, err := rand.Int(rand.Reader, big.NewInt(payOSOrderCodeRange))
	if err != nil {
		return 0, err
	}
	return payOSOrderCodeBase + n.Int64(), nil
}
