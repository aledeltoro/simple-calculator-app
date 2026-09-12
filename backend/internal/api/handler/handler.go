package handler

import (
	"encoding/json"
	"net/http"

	"github.com/aledeltoro/simple-calculator-app/internal/models"
	"github.com/aledeltoro/simple-calculator-app/internal/service"
)

type Handler interface {
	HandleCalculate() http.HandlerFunc
}

type handler struct {
	service service.CalculatorService
}

func NewHandler(service service.CalculatorService) Handler {
	return handler{
		service: service,
	}
}

func (h handler) HandleCalculate() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req models.CalculateRequest

		err := json.NewDecoder(r.Body).Decode(&req)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		result, err := h.service.Calculate(req.Expression)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusOK)
		w.Header().Set("Content-Type", "application/json")

		response := models.CalculateResponse{
			Result: result,
		}

		err = json.NewEncoder(w).Encode(response)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
	}
}
