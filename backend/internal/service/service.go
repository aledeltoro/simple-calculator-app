// Package service provides service for calculating mathematical expressions
package service

import (
	"errors"
	"go/parser"
)

var (
	// ErrExpressionParsingFailed error when parsing of expression to an Abstract Syntax Tree failed
	ErrExpressionParsingFailed = errors.New("expression parsing failed")
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

func (c calculatorService) Calculate(rawExpression string) (float64, error) {
	_, err := parser.ParseExpr(rawExpression)
	if err != nil {
		return 0, ErrExpressionParsingFailed
	}

	return 0, nil
}
