package api

import (
	"encoding/json"
	"net/http"

	"github.com/aledeltoro/simple-calculator-app/internal/models"
)

func WriteJSONResponse(w http.ResponseWriter, statusCode int, value any) {
	w.Header().Add("Content-Type", "application/json")
	w.WriteHeader(statusCode)

	_ = json.NewEncoder(w).Encode(value)
}

func WriteErrorResponse(w http.ResponseWriter, err error) {
	switch err {
	case models.ErrExpressionParsingFailed, models.ErrUnsupportedMathOperation, models.ErrRequestParseFailed, models.ErrDivisionByZero, models.ErrComplexNumberCalculationsNotSupported:
		WriteJSONResponse(w, http.StatusBadRequest, NewBadRequestError(err))
	case models.ErrUnsupportedExpressionFound:
		WriteJSONResponse(w, http.StatusInternalServerError, NewInternalServerError(err))
	default:
		WriteJSONResponse(w, http.StatusInternalServerError, NewInternalServerError(err))
	}
}
