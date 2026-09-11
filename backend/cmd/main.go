package main

import (
	"fmt"
	"net/http"

	"github.com/aledeltoro/simple-calculator-app/internal/api"
)

func main() {
	s := api.CreateNewServer()
	s.MountHandlers()

	fmt.Println("Listening on port :3000")

	http.ListenAndServe(":3000", s.Router)
}
