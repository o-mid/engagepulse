package replay

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"runtime"

	"github.com/o-mid/engagepulse/internal/domain"
)

var Brands = []string{"acme-casino", "nova-sports"}

func Dir() string {
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		return ""
	}
	return filepath.Join(filepath.Dir(file), "..", "..", "testdata", "replay")
}

func LoadBrand(brand string) ([]domain.Event, domain.PlayerSnapshot, error) {
	events, err := LoadEvents(brand)
	if err != nil {
		return nil, domain.PlayerSnapshot{}, err
	}
	want, err := loadExpected(filepath.Join(Dir(), brand, "expected-player.json"))
	if err != nil {
		return nil, domain.PlayerSnapshot{}, err
	}
	return events, want, nil
}

func LoadEvents(brand string) ([]domain.Event, error) {
	return loadEvents(filepath.Join(Dir(), brand, "events.jsonl"))
}

func loadEvents(path string) ([]domain.Event, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("open %s: %w", path, err)
	}
	defer func() { _ = f.Close() }()

	sc := bufio.NewScanner(f)
	var events []domain.Event
	for sc.Scan() {
		line := sc.Bytes()
		if len(line) == 0 {
			continue
		}
		var evt domain.Event
		err = json.Unmarshal(line, &evt)
		if err != nil {
			return nil, fmt.Errorf("event %s: %w", path, err)
		}
		events = append(events, evt)
	}
	if err := sc.Err(); err != nil {
		return nil, fmt.Errorf("read %s: %w", path, err)
	}
	if len(events) == 0 {
		return nil, fmt.Errorf("no events in %s", path)
	}
	return events, nil
}

func loadExpected(path string) (domain.PlayerSnapshot, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return domain.PlayerSnapshot{}, fmt.Errorf("read %s: %w", path, err)
	}
	var snap domain.PlayerSnapshot
	err = json.Unmarshal(raw, &snap)
	if err != nil {
		return domain.PlayerSnapshot{}, fmt.Errorf("expected %s: %w", path, err)
	}
	return snap, nil
}
