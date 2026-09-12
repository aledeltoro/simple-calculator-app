package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/aledeltoro/simple-calculator-app/internal/api/handler"
	"github.com/aledeltoro/simple-calculator-app/internal/service"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

func main() {
	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Heartbeat("/health"))

	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("Hello World"))
	})

	service := service.NewCalculatorService()

	handler := handler.NewHandler(service)

	r.Route("/api/v1", func(r chi.Router) {
		r.Post("/calculations", http.HandlerFunc(handler.HandleCalculate()))
	})

	fmt.Println("Listening on port :3000")

	log.Fatalln(http.ListenAndServe(":3000", r))
}
