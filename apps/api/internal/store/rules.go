package store

import (
	"errors"
	"regexp"
	"strings"
)

var phonePattern = regexp.MustCompile(`^[0-9+(). -]{9,20}$`)

func Available(onHand, reserved, unavailable int) int {
	return onHand - reserved - unavailable
}

func ValidCustomer(name, phone, address string) error {
	if len([]rune(strings.TrimSpace(name))) < 2 || len([]rune(name)) > 100 {
		return errors.New("Họ tên phải có từ 2 đến 100 ký tự")
	}
	if !phonePattern.MatchString(strings.TrimSpace(phone)) {
		return errors.New("Số điện thoại không hợp lệ")
	}
	if len([]rune(strings.TrimSpace(address))) < 10 || len([]rune(address)) > 300 {
		return errors.New("Địa chỉ phải có từ 10 đến 300 ký tự")
	}
	return nil
}
