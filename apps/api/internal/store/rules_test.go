package store

import "testing"

func TestAvailable(t *testing.T) {
	if got := Available(20, 7, 2); got != 11 {
		t.Fatalf("want 11, got %d", got)
	}
}
func TestValidCustomer(t *testing.T) {
	if err := ValidCustomer("Nguyễn An", "0912345678", "123 Nguyen Hue, Quan 1"); err != nil {
		t.Fatal(err)
	}
	if err := ValidCustomer("", "123", "x"); err == nil {
		t.Fatal("expected invalid customer")
	}
}
