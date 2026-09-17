package replay

import (
	"fmt"
	"strings"
)

func Format(r Report) string {
	var b strings.Builder
	for _, br := range r.Results {
		if br.Pass {
			fmt.Fprintf(&b, "pass %s\n", br.Brand)
			continue
		}
		fmt.Fprintf(&b, "fail %s\n  got  %+v\n  want %+v\n", br.Brand, ContractOf(br.Got), ContractOf(br.Want))
	}
	return b.String()
}
