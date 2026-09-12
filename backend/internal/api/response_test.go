package api

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/aledeltoro/simple-calculator-app/internal/models"
	"github.com/stretchr/testify/require"
)

func TestWriteJSONResponse(t *testing.T) {
	tests := map[string]struct {
		input              any
		expectedStatusCode int
		expectedResponse   any
	}{
		"success response": {
			input:              map[string]string{"hello": "world"},
			expectedStatusCode: http.StatusOK,
			expectedResponse:   map[string]string{"hello": "world"},
		},
		"encoding failed": {
			input:              make(chan int),
			expectedStatusCode: http.StatusInternalServerError,
			expectedResponse:   NewInternalServerError(errors.New("encoding error")),
		},
	}

	for name, testCase := range tests {
		t.Run(name, func(t *testing.T) {
			c := require.New(t)

			writer := httptest.NewRecorder()

			WriteJSONResponse(writer, http.StatusOK, testCase.input)

			response := writer.Result()

			defer response.Body.Close()

			data, err := io.ReadAll(response.Body)
			c.NoError(err)
			c.NotNil(data)

			expectedParsedResponse, err := json.Marshal(testCase.expectedResponse)
			c.NoError(err)
			c.NotNil(expectedParsedResponse)

			c.Equal(testCase.expectedStatusCode, response.StatusCode)
			c.Equal("application/json", response.Header.Get("Content-Type"))
			c.JSONEq(string(expectedParsedResponse), string(data))
		})
	}
}

func TestWriteErrorResponse(t *testing.T) {
	tests := map[string]struct {
		input              error
		expectedStatusCode int
		expectedResponse   APIErr
	}{
		"bad request response": {
			input:              models.ErrExpressionParsingFailed,
			expectedStatusCode: http.StatusBadRequest,
			expectedResponse:   NewBadRequestError(models.ErrExpressionParsingFailed),
		},
		"internal server error response": {
			input:              models.ErrUnsupportedExpressionFound,
			expectedStatusCode: http.StatusInternalServerError,
			expectedResponse:   NewInternalServerError(models.ErrUnsupportedExpressionFound),
		},
	}

	for name, testCase := range tests {
		t.Run(name, func(t *testing.T) {
			c := require.New(t)

			writer := httptest.NewRecorder()

			WriteErrorResponse(writer, testCase.input)

			response := writer.Result()

			defer response.Body.Close()

			data, err := io.ReadAll(response.Body)
			c.NoError(err)
			c.NotNil(data)

			expectedParsedResponse, err := json.Marshal(testCase.expectedResponse)
			c.NoError(err)
			c.NotNil(expectedParsedResponse)

			c.Equal(testCase.expectedStatusCode, response.StatusCode)
			c.Equal("application/json", response.Header.Get("Content-Type"))
			c.JSONEq(string(expectedParsedResponse), string(data))
		})
	}
}
