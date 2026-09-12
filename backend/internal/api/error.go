package api

import (
	"net/http"
)

type ErrCode string

var (
	ErrCodeInternalServerError ErrCode = "internal_service_error"
	ErrCodeBadRequest          ErrCode = "bad_request"
)

type APIErr struct {
	ErrCode    ErrCode `json:"code"`
	Message    string  `json:"message"`
	statusCode int
	err        error
}

func (e APIErr) Unwrap() error {
	return e.err
}

func NewInternalServerError(err error) APIErr {
	apiErr := APIErr{
		ErrCode:    ErrCodeInternalServerError,
		Message:    "Internal server error",
		statusCode: http.StatusInternalServerError,
		err:        err,
	}

	return apiErr
}

func NewBadRequestError(err error) APIErr {
	return APIErr{
		ErrCode:    ErrCodeBadRequest,
		Message:    err.Error(),
		statusCode: http.StatusBadRequest,
		err:        err,
	}
}
