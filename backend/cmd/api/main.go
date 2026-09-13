package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/aledeltoro/simple-calculator-app/internal/api/handler"
	"github.com/aledeltoro/simple-calculator-app/internal/service"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

func main() {
	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	r.Use(cors.Handler(cors.Options{
		// AllowedOrigins:   []string{"https://foo.com"}, // Use this to allow specific origin hosts
		AllowedOrigins: []string{"https://*", "http://*"},
		// AllowOriginFunc:  func(r *http.Request, origin string) bool { return true },
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: false,
		MaxAge:           300, // Maximum value not ignored by any of major browsers
	}))

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status": "ok"}`))
	})

	service := service.NewCalculatorService()

	handler := handler.NewHandler(service)

	r.Route("/api/v1", func(r chi.Router) {
		r.Post("/calculations", http.HandlerFunc(handler.HandleCalculate()))
	})

	fmt.Println("Listening on port :3000")

	log.Fatalln(http.ListenAndServe(":3000", r))
}
