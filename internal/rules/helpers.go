package rules

import (
	"slices"

	"github.com/o-mid/engagepulse/internal/domain"
)

func hasOffer(tags []string, offer string) bool {
	return slices.Contains(tags, offer)
}

func withOffer(tags []string, offer string) []string {
	if hasOffer(tags, offer) {
		return append([]string{}, tags...)
	}
	out := append([]string{}, tags...)
	return append(out, offer)
}
