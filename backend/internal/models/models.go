package models

type CalculateRequest struct {
	Expression string `json:"expression"`
}

type CalculateResponse struct {
	Result float64 `json:"result"`
}
