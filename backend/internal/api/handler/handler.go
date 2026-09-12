// Package handler implements the controller layer for the API
package handler

import (
	"encoding/json"
	"net/http"

	"github.com/aledeltoro/simple-calculator-app/internal/api"
	"github.com/aledeltoro/simple-calculator-app/internal/models"
	"github.com/aledeltoro/simple-calculator-app/internal/service"
)

// Handler interface to handle implementation of controller layer
type Handler interface {
	HandleCalculate() http.HandlerFunc
}

type handler struct {
	service service.CalculatorService
}

// NewHandler constructor for controller layer
func NewHandler(service service.CalculatorService) Handler {
	return handler{
		service: service,
	}
}

// HandleCalculate controller for POST /calculations endpoint
func (h handler) HandleCalculate() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req models.CalculateRequest

		err := json.NewDecoder(r.Body).Decode(&req)
		if err != nil {
			api.WriteErrorResponse(w, models.ErrRequestParseFailed)
			return
		}

		result, err := h.service.Calculate(req.Expression)
		if err != nil {
			api.WriteErrorResponse(w, err)
			return
		}

		response := models.CalculateResponse{
			Result: result,
		}

		api.WriteJSONResponse(w, http.StatusOK, response)
	}
}
