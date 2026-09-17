package ingest

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
)

const HeaderKeyID = "X-Key-Id"

type Key struct {
	ID     string
	Secret string
}

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

func VerifyKeys(keys []Key, keyID, signature string, body []byte) error {
	if len(keys) == 0 {
		return fmt.Errorf("invalid hmac signature")
	}
	if keyID != "" {
		for _, k := range keys {
			if k.ID == keyID {
				return Verify(k.Secret, signature, body)
			}
		}
		return fmt.Errorf("invalid hmac signature")
	}
	for _, k := range keys {
		if err := Verify(k.Secret, signature, body); err == nil {
			return nil
		}
	}
	return fmt.Errorf("invalid hmac signature")
}
