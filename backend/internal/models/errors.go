package models

import "errors"

var (
	// ErrExpressionParsingFailed error when parsing of expression to an Abstract Syntax Tree failed
	ErrExpressionParsingFailed = errors.New("expression parsing failed")
	// ErrUnsupportedExpressionFound error when expression in AST is not supported by the evaluation package
	ErrUnsupportedExpressionFound = errors.New("unsupported expression found")
	// ErrUnsupportedMathOperation error when mathematical operation is not supported
	ErrUnsupportedMathOperation = errors.New("unsupported mathematical operation")
	// ErrRequestParseFailed error when handler fails to decode JSON request
	ErrRequestParseFailed = errors.New("failed to parse request")
)
