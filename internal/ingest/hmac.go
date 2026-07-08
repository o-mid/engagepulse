package ingest

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
)

func Sign(secret string, body []byte) string {
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write(body)
	return hex.EncodeToString(mac.Sum(nil))
}

func Verify(secret, signature string, body []byte) error {
	expected := Sign(secret, body)
	if !hmac.Equal([]byte(expected), []byte(signature)) {
		return fmt.Errorf("invalid hmac signature")
	}
	return nil
}
