// Package service provides service for calculating mathematical expressions
package service

import (
	"go/parser"

	"github.com/aledeltoro/simple-calculator-app/internal/evaluation"
	"github.com/aledeltoro/simple-calculator-app/internal/models"
)

// CalculatorService interface to implement service that parses and evalutes mathematical expressions
type CalculatorService interface {
	Calculate(rawExpression string) (float64, error)
}

type calculatorService struct{}

// NewCalculatorService constructor for implementation of CalculatorService interface
func NewCalculatorService() CalculatorService {
	return calculatorService{}
}

// Calculate parses and evaluates a mathematical expression
func (c calculatorService) Calculate(rawExpression string) (float64, error) {
	if rawExpression == "" {
		return 0, models.ErrEmptyExpression
	}

	expression, err := parser.ParseExpr(rawExpression)
	if err != nil {
		return 0, models.ErrExpressionParsingFailed
	}

	return evaluation.Evaluate(expression)
}
