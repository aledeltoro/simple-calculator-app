package models

// CalculateRequest model to parse request object with a raw mathematical expression
type CalculateRequest struct {
	Expression string `json:"expression"`
}

// CalculateResponse model to parse response object with result from mathematical expression
type CalculateResponse struct {
	Result float64 `json:"result"`
}
