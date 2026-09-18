package soak

import (
	"fmt"
	"strings"
)

func GuardURL(raw string) error {
	lower := strings.ToLower(raw)
	if strings.Contains(lower, "railway.app") || strings.Contains(lower, "up.railway") {
		return fmt.Errorf("refuse hosted Railway URL %s; soak is local only", raw)
	}
	return nil
}
