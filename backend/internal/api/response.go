package api

import (
	"encoding/json"
	"net/http"

	"github.com/aledeltoro/simple-calculator-app/internal/models"
)

// WriteJSONResponse function to encode a JSON response
func WriteJSONResponse(w http.ResponseWriter, statusCode int, value any) {
	w.Header().Add("Content-Type", "application/json")

	if statusCode != http.StatusOK {
		w.WriteHeader(statusCode)
	}

	if err := json.NewEncoder(w).Encode(value); err != nil {
		WriteErrorResponse(w, err)
	}
}

// WriteErrorResponse function to encode a JSON error response
func WriteErrorResponse(w http.ResponseWriter, err error) {
	switch err {
	case models.ErrExpressionParsingFailed, models.ErrUnsupportedMathOperation, models.ErrRequestParseFailed, models.ErrDivisionByZero, models.ErrComplexNumberCalculationsNotSupported, models.ErrEmptyExpression:
		WriteJSONResponse(w, http.StatusBadRequest, NewBadRequestError(err))
	case models.ErrUnsupportedExpressionFound:
		WriteJSONResponse(w, http.StatusInternalServerError, NewInternalServerError(err))
	default:
		WriteJSONResponse(w, http.StatusInternalServerError, NewInternalServerError(err))
	}
}
