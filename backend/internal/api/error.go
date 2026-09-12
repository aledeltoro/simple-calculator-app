package api

import (
	"net/http"
)

// ErrCode error code for each type of error in the service
type ErrCode string

var (
	// ErrCodeInternalServerError error code when service suffered an unexpected error
	ErrCodeInternalServerError ErrCode = "internal_service_error"
	// ErrCodeBadRequest error code when service received an invalid request
	ErrCodeBadRequest ErrCode = "bad_request"
)

// APIErr error type to standardize errors in the service
type APIErr struct {
	ErrCode    ErrCode `json:"code"`
	Message    string  `json:"message"`
	statusCode int
	err        error
}

// Unwrap returns an error
func (e APIErr) Unwrap() error {
	return e.err
}

// NewInternalServerError constructor to build an internal server response error
func NewInternalServerError(err error) APIErr {
	apiErr := APIErr{
		ErrCode:    ErrCodeInternalServerError,
		Message:    "Internal server error",
		statusCode: http.StatusInternalServerError,
		err:        err,
	}

	return apiErr
}

// NewBadRequestError constructor to build a bad request response error
func NewBadRequestError(err error) APIErr {
	return APIErr{
		ErrCode:    ErrCodeBadRequest,
		Message:    err.Error(),
		statusCode: http.StatusBadRequest,
		err:        err,
	}
}
