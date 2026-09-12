// Package evaluation provides implementation to traverse AST expression to calculate a mathematical expression
package evaluation

import (
	"errors"
	"go/ast"
	"go/token"
	"math"
	"strconv"
)

var (
	ErrUnsupportedExpressionFound = errors.New("unsupported expression found")
	ErrUnsupportedMathOperation   = errors.New("unsupported mathematical operation")
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
	}

	return 0, ErrUnsupportedExpressionFound
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
		result := leftNode / rightNode
		return float64(result), nil
	case token.XOR: // Handles exponentiation and square root
		return math.Pow(leftNode, rightNode), nil
	}

	return 0, ErrUnsupportedMathOperation
}
