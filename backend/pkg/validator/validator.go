package validator

import (
	"fmt"

	"github.com/go-playground/validator/v10"
)

type CustomValidator struct {
	validator *validator.Validate
}

func NewValidator() *CustomValidator {
	return &CustomValidator{
		validator: validator.New(),
	}
}

func (cv *CustomValidator) Validate(i interface{}) []string {
	err := cv.validator.Struct(i)
	if err == nil {
		return nil
	}

	var errors []string
	if validationErrors, ok := err.(validator.ValidationErrors); ok {
		for _, e := range validationErrors {
			errors = append(errors, fmt.Sprintf("Field '%s' failed on tag '%s'", e.Field(), e.Tag()))
		}
	} else {
		errors = append(errors, err.Error())
	}

	return errors
}
