// Package evaluation provides implementation to traverse AST expression to calculate a mathematical expression
package evaluation

import (
	"go/ast"
	"go/token"
	"math"
	"strconv"

	"github.com/aledeltoro/simple-calculator-app/internal/models"
)

func Evaluate(expression ast.Expr) (float64, error) {
	switch expression := expression.(type) {
	case *ast.BinaryExpr:
		return evaluateBinaryExpression(expression)
	case *ast.BasicLit:
		switch expression.Kind {
		case token.INT, token.FLOAT:
			num, err := strconv.ParseFloat(expression.Value, 64)
			return num, err
		}
	case *ast.ParenExpr:
		return Evaluate(expression.X)
	case *ast.UnaryExpr:
		switch expression.Op {
		case token.SUB:
			number, err := Evaluate(expression.X)

			return number * -1, err
		}
	}

	return 0, models.ErrUnsupportedExpressionFound
}

func evaluateBinaryExpression(expression *ast.BinaryExpr) (float64, error) {
	leftNode, err := Evaluate(expression.X)
	if err != nil {
		return 0, err
	}

	rightNode, err := Evaluate(expression.Y)
	if err != nil {
		return 0, err
	}

	switch expression.Op {
	case token.ADD:
		result := leftNode + rightNode
		return float64(result), nil
	case token.SUB:
		result := leftNode - rightNode
		return float64(result), nil
	case token.MUL:
		result := leftNode * rightNode
		return float64(result), nil
	case token.QUO: // Handles division and percentage
		if rightNode == 0 {
			return 0, models.ErrDivisionByZero
		}

		result := leftNode / rightNode
		return float64(result), nil
	case token.XOR: // Handles exponentiation and square root
		if leftNode < 0 {
			return 0, models.ErrComplexNumberCalculationsNotSupported
		}

		return math.Pow(leftNode, rightNode), nil
	}

	return 0, models.ErrUnsupportedMathOperation
}
