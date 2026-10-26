package handlers

import "testing"

func TestGeneratePayOSOrderCode(t *testing.T) {
	seen := make(map[int64]struct{}, 1000)
	for i := 0; i < 1000; i++ {
		code, err := generatePayOSOrderCode()
		if err != nil {
			t.Fatal(err)
		}
		if code < payOSOrderCodeBase || code >= payOSOrderCodeBase+payOSOrderCodeRange {
			t.Fatalf("code outside reserved random range: %d", code)
		}
		if code > 9_007_199_254_740_991 {
			t.Fatalf("code cannot be represented safely in JSON/JavaScript: %d", code)
		}
		if _, exists := seen[code]; exists {
			t.Fatalf("unexpected collision between generated payment codes: %d", code)
		}
		seen[code] = struct{}{}
	}
}
