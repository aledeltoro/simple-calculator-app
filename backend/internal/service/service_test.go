package service

import (
	"testing"

	"github.com/aledeltoro/simple-calculator-app/internal/models"
	"github.com/stretchr/testify/require"
)

func TestCalculate(t *testing.T) {
	tests := map[string]struct {
		input  string
		output float64
		err    error
	}{
		"success": {
			input:  "3 + 4",
			output: 7,
		},
		"expression parsing failed": {
			input: "√4",
			err:   models.ErrExpressionParsingFailed,
		},
	}

	for name, testCase := range tests {
		t.Run(name, func(t *testing.T) {
			c := require.New(t)

			service := NewCalculatorService()

			result, err := service.Calculate(testCase.input)
			if testCase.err != nil {
				c.Empty(result)
				c.Error(err)
				c.ErrorIs(err, testCase.err)

				return
			}

			c.NoError(err)
			c.NotEmpty(result)
			c.Equal(testCase.output, result)
		})
	}
}
