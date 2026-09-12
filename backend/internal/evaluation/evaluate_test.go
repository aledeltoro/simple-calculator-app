package evaluation

import (
	"go/parser"
	"testing"

	"github.com/aledeltoro/simple-calculator-app/internal/models"
	"github.com/stretchr/testify/require"
)

func TestEvaluate(t *testing.T) {
	t.Run("simple operations", func(t *testing.T) {
		tests := map[string]struct {
			input  string
			output float64
			err    error
		}{
			"addition": {
				input:  "2 + 3 + 7.5",
				output: 12.5,
			},
			"substraction": {
				input:  "2 + 3 - 7",
				output: -2,
			},
			"multiplication": {
				input:  "3 * 7.0",
				output: 21.0,
			},
			"division": {
				input:  "5 / 2",
				output: 2.5,
			},
			"exponentiation": {
				input:  "5^4",
				output: 625,
			},
			"square root": {
				input:  "9^0.5",
				output: 3,
			},
			"percentage": {
				input:  "(5 / 100)",
				output: 0.05,
			},
			"unsupported operation error": {
				input: "5 % 2",
				err:   models.ErrUnsupportedMathOperation,
			},
			"unsupported expression error": {
				input: "a[1]",
				err:   models.ErrUnsupportedExpressionFound,
			},
			"negative numbers": {
				input:  "-9 + 1",
				output: -8,
			},
			"division by zero error": {
				input: "5 / 0",
				err:   models.ErrDivisionByZero,
			},
			"negative square root error": {
				input: "-9^0.5",
				err:   models.ErrComplexNumberCalculationsNotSupported,
			},
		}

		for name, testCase := range tests {
			t.Run(name, func(t *testing.T) {
				c := require.New(t)

				expression, err := parser.ParseExpr(testCase.input)
				c.NoError(err)
				c.NotEmpty(expression)

				result, err := Evaluate(expression)
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
	})
}
