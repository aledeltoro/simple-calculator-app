# API resources

## Health

<details>
 <summary><code>GET</code> <code><b>/health</b></code> <code>(Checks if the service is healthy)</code></summary>

### Parameters

> None

### Responses

#### HTTP Code 200

```json
{
  "status": "ok"
}
```

</details>

## Calculate

<details>
 <summary><code>POST</code> <code><b>/api/v1/calculations</b></code> <code>(Performs calculation based on raw mathematical expression)</code></summary>

### Request

```json
{
  "expression": "2 + 3 * 5 + (12 / 10)"
}
```

### Responses

#### HTTP Code 200

Successful calculation

```json
{
  "result": 18.2
}
```

#### HTTP Code 400

```json
{
  "code": "bad_request",
  "message": "division by zero not allowed"
}
```

#### HTTP Code 500

```json
{
  "code": "internal_service_error",
  "message": "Internal server error"
}
```

</details>
