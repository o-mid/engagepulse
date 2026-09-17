package rulepatch

import (
	"fmt"
	"strings"

	"github.com/o-mid/engagepulse/internal/rules"
)

type Patch struct {
	Thresholds rules.Thresholds
	Diff       string
}

func Diff(from, to rules.Thresholds) string {
	var b strings.Builder
	b.WriteString("--- a/internal/rules/thresholds.go\n")
	b.WriteString("+++ b/internal/rules/thresholds.go\n")
	writeLine(&b, "WelcomeCredit", from.WelcomeCredit, to.WelcomeCredit)
	writeLine(&b, "VIPSilverThreshold", from.VIPSilverThreshold, to.VIPSilverThreshold)
	writeLine(&b, "VIPGoldThreshold", from.VIPGoldThreshold, to.VIPGoldThreshold)
	writeLine(&b, "VelocityBetLimit", from.VelocityBetLimit, to.VelocityBetLimit)
	return b.String()
}

func writeLine(b *strings.Builder, name string, from, to int64) {
	if from == to {
		return
	}
	fmt.Fprintf(b, "-\t%s int64 = %d\n", name, from)
	fmt.Fprintf(b, "+\t%s int64 = %d\n", name, to)
}
