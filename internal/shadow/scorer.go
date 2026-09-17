package shadow

import (
	"fmt"
	"net/http"
	"os"
	"strings"
)

func NewFromEnv() (Scorer, error) {
	return New(os.Getenv("SHADOW_SCORER"), os.Getenv("OPENAI_API_KEY"), os.Getenv("OPENAI_MODEL"), nil)
}

func New(kind, apiKey, model string, client *http.Client) (Scorer, error) {
	switch strings.ToLower(strings.TrimSpace(kind)) {
	case "", "mock":
		return Mock{}, nil
	case "openai":
		if apiKey == "" {
			return nil, fmt.Errorf("SHADOW_SCORER=openai requires OPENAI_API_KEY")
		}
		if client == nil {
			client = http.DefaultClient
		}
		if model == "" {
			model = "gpt-4o-mini"
		}
		return OpenAI{Client: client, APIKey: apiKey, Model: model}, nil
	default:
		return nil, fmt.Errorf("unknown SHADOW_SCORER %q", kind)
	}
}
