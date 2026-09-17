package shadow

import (
	"context"
	"fmt"

	"github.com/o-mid/engagepulse/internal/domain"
	"github.com/o-mid/engagepulse/internal/replay"
	"github.com/o-mid/engagepulse/internal/rules"
)

var Packs = []string{"acme-casino", "nova-sports", "sparse-bets"}

type Row struct {
	Pack      string
	RuleFlag  bool
	ModelFlag bool
	Agree     bool
	Reason    string
}

type Board struct {
	Rows []Row
}

func (b Board) Disagreements() []Row {
	var out []Row
	for _, row := range b.Rows {
		if !row.Agree {
			out = append(out, row)
		}
	}
	return out
}

func Compare(ctx context.Context, s Scorer) (Board, error) {
	var board Board
	for _, name := range Packs {
		events, err := replay.LoadEvents(name)
		if err != nil {
			return Board{}, err
		}
		row, err := scorePack(ctx, s, name, events)
		if err != nil {
			return Board{}, err
		}
		board.Rows = append(board.Rows, row)
	}
	return board, nil
}

func scorePack(ctx context.Context, s Scorer, name string, events []domain.Event) (Row, error) {
	rule := RuleWouldFlag(events, rules.Defaults().VelocityBetLimit)
	dec, err := s.Score(ctx, events)
	if err != nil {
		return Row{}, err
	}
	return Row{
		Pack:      name,
		RuleFlag:  rule,
		ModelFlag: dec.Flag,
		Agree:     rule == dec.Flag,
		Reason:    dec.Reason,
	}, nil
}

func yn(v bool) string {
	if v {
		return "yes"
	}
	return "no"
}

func Format(b Board) string {
	out := "pack\trule\tmodel\tagree\n"
	for _, row := range b.Rows {
		out += fmt.Sprintf("%s\t%s\t%s\t%s\n", row.Pack, yn(row.RuleFlag), yn(row.ModelFlag), yn(row.Agree))
		if !row.Agree && row.Reason != "" {
			out += "  " + row.Reason + "\n"
		}
	}
	return out
}
