package rulepatch

import (
	"fmt"
	"net/http"
	"os"
	"strings"
)

func NewFromEnv() (Proposer, error) {
	return New(os.Getenv("PROPOSER"), os.Getenv("OPENAI_API_KEY"), os.Getenv("OPENAI_MODEL"), nil)
}

func New(kind, apiKey, model string, client *http.Client) (Proposer, error) {
	switch strings.ToLower(strings.TrimSpace(kind)) {
	case "", "mock":
		return Mock{}, nil
	case "openai":
		if apiKey == "" {
			return nil, fmt.Errorf("PROPOSER=openai requires OPENAI_API_KEY")
		}
		if client == nil {
			client = http.DefaultClient
		}
		if model == "" {
			model = "gpt-4o-mini"
		}
		return OpenAI{Client: client, APIKey: apiKey, Model: model}, nil
	default:
		return nil, fmt.Errorf("unknown PROPOSER %q", kind)
	}
}
