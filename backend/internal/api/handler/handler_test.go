package handler

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/aledeltoro/simple-calculator-app/internal/api"
	"github.com/aledeltoro/simple-calculator-app/internal/models"
	"github.com/aledeltoro/simple-calculator-app/internal/service"
	"github.com/go-chi/chi/v5"
	"github.com/stretchr/testify/require"
)

func TestHandleCalculate(t *testing.T) {
	service := service.NewCalculatorService()

	handler := NewHandler(service)

	router := chi.NewRouter()
	router.Post("/calculations", http.HandlerFunc(handler.HandleCalculate()))

	tests := map[string]struct {
		input               any
		expectedStatusCode  int
		expectedResponse    models.CalculateResponse
		expectedErrResponse api.APIErr
	}{
		"success": {
			input: &models.CalculateRequest{
				Expression: "2 + 3 * 4",
			},
			expectedStatusCode: http.StatusOK,
			expectedResponse: models.CalculateResponse{
				Result: 14,
			},
		},
		"request parse failed": {
			input:               `{"expression": "wrong-type"}`,
			expectedStatusCode:  http.StatusBadRequest,
			expectedErrResponse: api.NewBadRequestError(models.ErrRequestParseFailed),
		},
		"calculate service error": {
			input:               nil,
			expectedStatusCode:  http.StatusBadRequest,
			expectedErrResponse: api.NewBadRequestError(models.ErrEmptyExpression),
		},
	}

	for name, testCase := range tests {
		t.Run(name, func(t *testing.T) {
			c := require.New(t)

			parsedRequest, err := json.Marshal(testCase.input)
			c.NoError(err)
			c.NotNil(parsedRequest)

			req := httptest.NewRequest(http.MethodPost, "/calculations", bytes.NewReader(parsedRequest))
			req.Header.Add("Content-Type", "application/json")

			recorder := httptest.NewRecorder()
			router.ServeHTTP(recorder, req)

			response := recorder.Result()

			defer response.Body.Close()

			c.Equal(testCase.expectedStatusCode, response.StatusCode)

			if testCase.expectedErrResponse != (api.APIErr{}) {
				var result api.APIErr

				err := json.NewDecoder(response.Body).Decode(&result)
				c.NoError(err)

				c.Equal(testCase.expectedErrResponse.ErrCode, result.ErrCode)
				c.Equal(testCase.expectedErrResponse.Message, result.Message)

				return
			}

			var result models.CalculateResponse

			err = json.NewDecoder(response.Body).Decode(&result)
			c.NoError(err)

			c.Equal(testCase.expectedResponse.Result, result.Result)
		})
	}
}
