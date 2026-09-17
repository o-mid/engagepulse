package rules

type Thresholds struct {
	WelcomeCredit      int64
	VIPSilverThreshold int64
	VIPGoldThreshold   int64
	VelocityBetLimit   int64
}

func Defaults() Thresholds {
	return Thresholds{
		WelcomeCredit:      WelcomeCredit,
		VIPSilverThreshold: VIPSilverThreshold,
		VIPGoldThreshold:   VIPGoldThreshold,
		VelocityBetLimit:   VelocityBetLimit,
	}
}

// Numbers are small so a short demo run can cross them.
const (
	WelcomeCredit      int64 = 100
	VIPSilverThreshold int64 = 1000
	VIPGoldThreshold   int64 = 5000
	// VelocityBetLimit: bets in a ~1 minute window that trip the integrity flag.
	VelocityBetLimit int64 = 5
)
