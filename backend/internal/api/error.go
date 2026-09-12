package api

import (
	"fmt"
	"net/http"
)

type ErrCode string

var (
	ErrCodeInternalServer ErrCode = "internal_service_error"
	ErrCodeBadRequest     ErrCode = "bad_request"
)

type APIError interface {
	error
	Unwrap() error
	HTTPStatusCode() int
	Code() ErrCode
}

type APIErr struct {
	ErrCode    ErrCode `json:"code"`
	Message    string  `json:"message"`
	statusCode int
	err        error
}

func (e APIErr) Unwrap() error {
	return e.err
}

func (e APIErr) HTTPStatusCode() int {
	return e.statusCode
}

func (e APIErr) Code() ErrCode {
	return e.ErrCode
}

func (e APIErr) Error() string {
	return fmt.Sprintf("(%d) %s", e.statusCode, e.Message)
}

func NewInternalServerError(err error) APIErr {
	apiErr := APIErr{
		ErrCode:    ErrCodeInternalServer,
		Message:    "Internal server error",
		statusCode: http.StatusInternalServerError,
		err:        err,
	}

	return apiErr
}

func NewBadRequestError(err error) APIErr {
	return APIErr{
		ErrCode:    ErrCodeBadRequest,
		Message:    fmt.Sprintf("Invalid request: %s", err.Error()),
		statusCode: http.StatusBadRequest,
		err:        err,
	}
}
